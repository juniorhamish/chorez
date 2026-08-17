"use server";

import { sql } from "@/lib/db";
import { getDbUser } from "./user-actions";
import { commentOnIssue, createIssue, searchOpenIssues, type GithubIssueSummary } from "@/lib/github";
import { screenFeedbackReport } from "@/lib/feedback-screening";

// At most this many reports per user within the rolling window below, to
// stop a single user from spamming the GitHub repo with new issues/comments.
const RATE_LIMIT_MAX_REPORTS = 1;
const RATE_LIMIT_WINDOW_MINUTES = 5;

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 2000;

export interface HelpReportResult {
  action: "created" | "commented";
  issueNumber: number;
  issueUrl: string;
}

// Submits a user's "Report an issue" message from the Help button as a
// GitHub issue (or a comment on a matching existing one), on behalf of a
// shared service account so the user never needs a GitHub account of their
// own. Guarded by: basic input validation, a per-user rate limit, and an AI
// screening step (gibberish/spam rejection + duplicate detection against a
// handful of candidate open issues found via GitHub search).
export async function submitHelpReport(message: string): Promise<HelpReportResult> {
  const dbUser = await getDbUser();
  if (!dbUser) {
    throw new Error("Not authenticated");
  }

  const trimmed = message.trim();
  if (trimmed.length < MIN_MESSAGE_LENGTH) {
    throw new Error(`Please provide a bit more detail (at least ${MIN_MESSAGE_LENGTH} characters).`);
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Please keep your report under ${MAX_MESSAGE_LENGTH} characters.`);
  }

  const recentReports = await sql`
    SELECT COUNT(*)::int as count FROM feedback_reports
    WHERE user_id = ${dbUser.id}
      AND created_at > NOW() - make_interval(mins => ${RATE_LIMIT_WINDOW_MINUTES})
  `;
  if ((recentReports[0]?.count ?? 0) >= RATE_LIMIT_MAX_REPORTS) {
    throw new Error("You've already submitted a report recently. Please try again later.");
  }

  // Narrow down to a handful of plausibly-related open issues (keyword
  // search), which the AI screening step below then judges for a genuine
  // semantic match before we decide whether to comment instead of opening a
  // new issue. If the search itself fails, fall back to no candidates rather
  // than blocking the report entirely.
  let candidateIssues: GithubIssueSummary[] = [];
  try {
    const searchTerms = trimmed.split(/\s+/).slice(0, 8).join(" ");
    candidateIssues = await searchOpenIssues(searchTerms);
  } catch (error) {
    console.error("Failed to search existing GitHub issues:", error);
  }

  const screening = await screenFeedbackReport(
    trimmed,
    candidateIssues.map((issue) => ({ number: issue.number, title: issue.title, body: issue.body }))
  );

  if (!screening.isCoherent) {
    throw new Error(screening.reason ?? "Please describe the issue in a clear sentence so we can understand it.");
  }

  const reportBody = `${trimmed}\n\n---\n*Submitted anonymously via the Chorez app's Help button.*`;

  let result: HelpReportResult;
  if (screening.duplicateIssueNumber != null) {
    await commentOnIssue(screening.duplicateIssueNumber, reportBody);
    const matchedIssue = candidateIssues.find((issue) => issue.number === screening.duplicateIssueNumber);
    result = {
      action: "commented",
      issueNumber: screening.duplicateIssueNumber,
      issueUrl: matchedIssue?.htmlUrl ?? `https://github.com/${process.env.GITHUB_REPO}/issues/${screening.duplicateIssueNumber}`,
    };
  } else {
    const created = await createIssue(screening.title, reportBody);
    result = { action: "created", issueNumber: created.number, issueUrl: created.htmlUrl };
  }

  await sql`
    INSERT INTO feedback_reports (user_id, message, github_issue_number, github_issue_action)
    VALUES (${dbUser.id}, ${trimmed}, ${result.issueNumber}, ${result.action})
  `;

  return result;
}
