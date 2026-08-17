"use server";

import { sql } from "@/lib/db";
import { getDbUser } from "./user-actions";
import { commentOnIssue, createIssue, searchOpenIssues, type GithubIssueSummary } from "@/lib/github";
import { screenFeedbackReport } from "@/lib/feedback-screening";

// At most this many reports per user within the rolling window below, to
// stop a single user from spamming the GitHub repo with new issues/comments.
const RATE_LIMIT_MAX_REPORTS = 1;
const RATE_LIMIT_WINDOW_MINUTES = 2;

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 2000;

export interface HelpReportResult {
  action: "created" | "commented";
  issueNumber: number;
  issueUrl: string;
}

// Expected errors (validation, rate limiting, AI rejection, upstream
// failures) are modelled as a return value rather than a thrown exception.
// Server Actions that throw are unreliable to surface to the UI: in
// production Next.js redacts/normalises errors from the server boundary, and
// an uncaught rejection can end up rendered as a raw "Minified React error"
// instead of a friendly message. Returning a plain object means the caller
// always gets something safe to read and display.
export type HelpReportOutcome = { ok: true; result: HelpReportResult } | { ok: false; error: string };

// Submits a user's "Report an issue" message from the Help button as a
// GitHub issue (or a comment on a matching existing one), on behalf of a
// shared service account so the user never needs a GitHub account of their
// own. Guarded by: basic input validation, a per-user rate limit, and an AI
// screening step (gibberish/spam rejection + duplicate detection against a
// handful of candidate open issues found via GitHub search).
export async function submitHelpReport(message: string): Promise<HelpReportOutcome> {
  try {
    const dbUser = await getDbUser();
    if (!dbUser) {
      return { ok: false, error: "You need to be signed in to report an issue." };
    }

    const trimmed = message.trim();
    if (trimmed.length < MIN_MESSAGE_LENGTH) {
      return { ok: false, error: `Please provide a bit more detail (at least ${MIN_MESSAGE_LENGTH} characters).` };
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return { ok: false, error: `Please keep your report under ${MAX_MESSAGE_LENGTH} characters.` };
    }

    const recentReports = await sql`
      SELECT COUNT(*)::int as count FROM feedback_reports
      WHERE user_id = ${dbUser.id}
        AND created_at > NOW() - make_interval(mins => ${RATE_LIMIT_WINDOW_MINUTES})
    `;
    if ((recentReports[0]?.count ?? 0) >= RATE_LIMIT_MAX_REPORTS) {
      return { ok: false, error: "You've already submitted a report recently. Please try again later." };
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

    let screening;
    try {
      screening = await screenFeedbackReport(
        trimmed,
        candidateIssues.map((issue) => ({ number: issue.number, title: issue.title, body: issue.body }))
      );
    } catch (error) {
      console.error("Failed to screen feedback report with AI:", error);
      return { ok: false, error: "We couldn't process your report right now. Please try again in a moment." };
    }

    if (!screening.isCoherent) {
      return {
        ok: false,
        error: screening.reason ?? "Please describe the issue in a clear sentence so we can understand it.",
      };
    }

    const reportBody = `${trimmed}\n\n---\n*Submitted anonymously via the Chorez app's Help button.*`;

    let result: HelpReportResult;
    try {
      if (screening.duplicateIssueNumber != null) {
        await commentOnIssue(screening.duplicateIssueNumber, reportBody);
        const matchedIssue = candidateIssues.find((issue) => issue.number === screening.duplicateIssueNumber);
        result = {
          action: "commented",
          issueNumber: screening.duplicateIssueNumber,
          issueUrl:
            matchedIssue?.htmlUrl ?? `https://github.com/${process.env.GITHUB_REPO}/issues/${screening.duplicateIssueNumber}`,
        };
      } else {
        const created = await createIssue(screening.title, reportBody);
        result = { action: "created", issueNumber: created.number, issueUrl: created.htmlUrl };
      }
    } catch (error) {
      console.error("Failed to submit feedback report to GitHub:", error);
      return { ok: false, error: "We couldn't submit your report to GitHub right now. Please try again later." };
    }

    try {
      await sql`
        INSERT INTO feedback_reports (user_id, message, github_issue_number, github_issue_action)
        VALUES (${dbUser.id}, ${trimmed}, ${result.issueNumber}, ${result.action})
      `;
    } catch (error) {
      // The GitHub issue/comment was already created successfully at this point,
      // so a failure here (audit trail + rate limit bookkeeping) shouldn't be
      // shown to the user as a failed submission.
      console.error("Failed to record feedback report after successful GitHub submission:", error);
    }

    return { ok: true, result };
  } catch (error) {
    // Final safety net: whatever goes wrong, never let it escape as a thrown
    // exception across the Server Action boundary. Log it for diagnosis and
    // hand the caller a friendly, generic message instead.
    console.error("Unexpected error while submitting a help report:", error);
    return { ok: false, error: "Something went wrong while submitting your report. Please try again." };
  }
}
