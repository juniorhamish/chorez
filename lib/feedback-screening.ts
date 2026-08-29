// Thin wrapper around the Google Gemini REST API used to screen user-submitted
// "Report an issue" messages before they're turned into a GitHub issue: it
// rejects gibberish/spam, drafts a short issue title, and checks whether the
// report duplicates one of a handful of candidate existing open issues
// (already narrowed down by a keyword search against the GitHub repo).
//
// We call the REST API directly, matching the same "plain fetch" style used
// by lib/gemini.ts for the schedule optimiser, rather than pulling in the
// @google/genai SDK.

export interface FeedbackCandidateIssue {
  number: number;
  title: string;
  body: string;
}

export interface FeedbackScreeningResult {
  isCoherent: boolean;
  reason: string | null;
  title: string;
  duplicateIssueNumber: number | null;
}

const DEFAULT_MODEL = "gemini-3.7-flash";

function buildResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
      isCoherent: {
        type: "BOOLEAN",
        description:
          "true if the report is a genuine, coherent English sentence (or short passage) describing a real bug, problem, or feature request. false if it is gibberish, random keyboard mashing, a single meaningless word, spam, or otherwise doesn't make sense as an issue report.",
      },
      reason: {
        type: "STRING",
        nullable: true,
        description:
          "Only if isCoherent is false: one short, friendly sentence explaining why, to show the user so they can rewrite it. Null if isCoherent is true.",
      },
      title: {
        type: "STRING",
        description:
          "A short (at most 80 characters) descriptive issue title summarising the report, suitable as a GitHub issue title. Only meaningful if isCoherent is true.",
      },
      duplicateIssueNumber: {
        type: "INTEGER",
        nullable: true,
        description:
          "The number of the candidate issue this report duplicates (matching by meaning, not just exact wording), or null if none of the candidates match or isCoherent is false. Must be exactly one of the candidate issue numbers provided, or null — never an invented number.",
      },
    },
    required: ["isCoherent"],
  };
}

function buildPrompt(message: string, candidateIssues: FeedbackCandidateIssue[]): string {
  const candidatesText =
    candidateIssues.length > 0
      ? candidateIssues
          .map((issue) => `- #${issue.number}: "${issue.title}"\n  ${issue.body.slice(0, 300).replace(/\s+/g, " ").trim()}`)
          .join("\n")
      : "(no candidate issues found)";
  const validNumbers = candidateIssues.map((issue) => `#${issue.number}`).join(", ") || "none";

  return `You are triaging a user-submitted "Report an issue" message from the "Chorez" household chore tracker app, before it is turned into a GitHub issue on the project's repository.

User's report:
"""
${message}
"""

Candidate existing OPEN GitHub issues that might already cover this report (found via a keyword search, so some may be unrelated):
${candidatesText}

Tasks:
1. Decide if the user's report is a genuine, coherent English sentence (or short passage) describing a real bug, problem, or feature request — as opposed to gibberish, random keyboard mashing, a single meaningless word, spam, or incoherent nonsense. It does not need to be grammatically perfect, just genuinely intelligible.
2. If it is coherent, write a short (at most 80 characters) descriptive title suitable for a GitHub issue.
3. If it is coherent, decide whether it is a duplicate of one of the candidate issues listed above (matching by meaning, not just exact wording). Only pick a duplicate if you are confident it describes the same underlying problem or request. If none match, or there are no candidates, return null.

Return a JSON object with "isCoherent", "reason" (only if isCoherent is false), "title" (only meaningful if isCoherent is true), and "duplicateIssueNumber" (one of ${validNumbers}, or null).`;
}

export async function screenFeedbackReport(
  message: string,
  candidateIssues: FeedbackCandidateIssue[]
): Promise<FeedbackScreeningResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(message, candidateIssues) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: buildResponseSchema(),
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API request failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini API returned no content");
  }

  let parsed: Partial<FeedbackScreeningResult>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini API returned invalid JSON: ${text}`);
  }

  if (typeof parsed.isCoherent !== "boolean") {
    throw new Error("Gemini API response is missing 'isCoherent'");
  }

  // Never trust an issue number Gemini didn't actually see — guards against
  // an invented or hallucinated "duplicate" being commented on.
  const validIssueNumbers = new Set(candidateIssues.map((issue) => issue.number));
  const duplicateIssueNumber =
    typeof parsed.duplicateIssueNumber === "number" && validIssueNumbers.has(parsed.duplicateIssueNumber)
      ? parsed.duplicateIssueNumber
      : null;

  return {
    isCoherent: parsed.isCoherent,
    reason: parsed.isCoherent
      ? null
      : parsed.reason?.trim() || "This doesn't look like a genuine issue report. Please describe the problem in a clear sentence.",
    title: parsed.title?.trim() || message.slice(0, 80),
    duplicateIssueNumber,
  };
}
