import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();
vi.mock("@/lib/db", () => ({ sql: sqlMock }));

const getDbUserMock = vi.fn();
vi.mock("./user-actions", () => ({ getDbUser: getDbUserMock }));

const searchOpenIssuesMock = vi.fn();
const createIssueMock = vi.fn();
const commentOnIssueMock = vi.fn();
vi.mock("@/lib/github", () => ({
  searchOpenIssues: searchOpenIssuesMock,
  createIssue: createIssueMock,
  commentOnIssue: commentOnIssueMock,
}));

const screenFeedbackReportMock = vi.fn();
vi.mock("@/lib/feedback-screening", () => ({
  screenFeedbackReport: screenFeedbackReportMock,
}));

const { submitHelpReport } = await import("./feedback-actions");

const DB_USER = { id: "user-1", active_household_id: "household-1" };
const VALID_MESSAGE = "The app crashes every time I try to complete a task.";

beforeEach(() => {
  sqlMock.mockReset();
  getDbUserMock.mockReset();
  searchOpenIssuesMock.mockReset();
  createIssueMock.mockReset();
  commentOnIssueMock.mockReset();
  screenFeedbackReportMock.mockReset();

  getDbUserMock.mockResolvedValue(DB_USER);
  sqlMock.mockResolvedValue([{ count: 0 }]); // rate-limit count query, then INSERT (return value unused)
  searchOpenIssuesMock.mockResolvedValue([]);
  screenFeedbackReportMock.mockResolvedValue({
    isCoherent: true,
    reason: null,
    title: "App crashes on task completion",
    duplicateIssueNumber: null,
  });
  createIssueMock.mockResolvedValue({
    number: 5,
    title: "App crashes on task completion",
    body: VALID_MESSAGE,
    htmlUrl: "https://github.com/juniorhamish/chorez/issues/5",
  });
  process.env.GITHUB_REPO = "juniorhamish/chorez";
});

describe("submitHelpReport - authentication and validation", () => {
  it("returns a friendly error when there is no authenticated user", async () => {
    getDbUserMock.mockResolvedValue(null);
    const outcome = await submitHelpReport(VALID_MESSAGE);

    expect(outcome).toEqual({ ok: false, error: expect.stringMatching(/signed in/) });
  });

  it("rejects a message that's too short", async () => {
    const outcome = await submitHelpReport("too short");

    expect(outcome).toEqual({ ok: false, error: expect.stringMatching(/more detail/) });
  });

  it("rejects a message that's too long", async () => {
    const outcome = await submitHelpReport("a".repeat(2001));

    expect(outcome).toEqual({ ok: false, error: expect.stringMatching(/under 2000 characters/) });
  });
});

describe("submitHelpReport - rate limiting", () => {
  it("returns an error when the user has already submitted a report within the rate-limit window", async () => {
    sqlMock.mockResolvedValueOnce([{ count: 1 }]);

    const outcome = await submitHelpReport(VALID_MESSAGE);

    expect(outcome).toEqual({ ok: false, error: expect.stringMatching(/already submitted a report recently/) });
    expect(screenFeedbackReportMock).not.toHaveBeenCalled();
  });

  it("scopes the rate-limit check to the current user", async () => {
    await submitHelpReport(VALID_MESSAGE);

    expect(sqlMock.mock.calls[0]).toContain(DB_USER.id);
  });
});

describe("submitHelpReport - AI screening", () => {
  it("returns the AI's reason when the report isn't coherent", async () => {
    screenFeedbackReportMock.mockResolvedValueOnce({
      isCoherent: false,
      reason: "This looks like gibberish.",
      title: "",
      duplicateIssueNumber: null,
    });

    const outcome = await submitHelpReport(VALID_MESSAGE);

    expect(outcome).toEqual({ ok: false, error: "This looks like gibberish." });
    expect(createIssueMock).not.toHaveBeenCalled();
    expect(commentOnIssueMock).not.toHaveBeenCalled();
  });

  it("still screens the report even if the GitHub search for candidates fails", async () => {
    searchOpenIssuesMock.mockRejectedValueOnce(new Error("network error"));

    const outcome = await submitHelpReport(VALID_MESSAGE);

    expect(screenFeedbackReportMock).toHaveBeenCalledWith(VALID_MESSAGE, []);
    expect(outcome.ok).toBe(true);
    expect(outcome.ok && outcome.result.action).toBe("created");
  });

  it("translates an AI screening failure into a friendly error instead of the raw error", async () => {
    screenFeedbackReportMock.mockRejectedValueOnce(new Error("Gemini API request failed (500): internal error"));

    const outcome = await submitHelpReport(VALID_MESSAGE);

    expect(outcome).toEqual({ ok: false, error: expect.stringMatching(/try again in a moment/) });
  });
});

describe("submitHelpReport - GitHub issue creation", () => {
  it("translates a GitHub API failure into a friendly error instead of the raw error", async () => {
    createIssueMock.mockRejectedValueOnce(new Error("Failed to create GitHub issue (422): validation failed"));

    const outcome = await submitHelpReport(VALID_MESSAGE);

    expect(outcome).toEqual({ ok: false, error: expect.stringMatching(/try again later/) });
  });

  it("still returns the result even if recording the report afterwards fails", async () => {
    sqlMock.mockResolvedValueOnce([{ count: 0 }]); // rate-limit SELECT succeeds
    sqlMock.mockRejectedValueOnce(new Error("connection lost")); // INSERT fails

    const outcome = await submitHelpReport(VALID_MESSAGE);

    expect(outcome).toEqual({
      ok: true,
      result: {
        action: "created",
        issueNumber: 5,
        issueUrl: "https://github.com/juniorhamish/chorez/issues/5",
      },
    });
  });

  it("creates a new issue when there is no duplicate, and records the report", async () => {
    const outcome = await submitHelpReport(VALID_MESSAGE);

    expect(createIssueMock).toHaveBeenCalledWith("App crashes on task completion", expect.stringContaining(VALID_MESSAGE));
    expect(commentOnIssueMock).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      ok: true,
      result: {
        action: "created",
        issueNumber: 5,
        issueUrl: "https://github.com/juniorhamish/chorez/issues/5",
      },
    });

    // The INSERT into feedback_reports is the 2nd sql call (after the
    // rate-limit SELECT), and should record the user, message and outcome.
    const insertArgs = sqlMock.mock.calls[1];
    expect(insertArgs).toContain(DB_USER.id);
    expect(insertArgs).toContain(VALID_MESSAGE);
    expect(insertArgs).toContain(5);
    expect(insertArgs).toContain("created");
  });
});

describe("submitHelpReport - GitHub duplicate handling", () => {
  it("comments on the matching existing issue instead of creating a new one", async () => {
    searchOpenIssuesMock.mockResolvedValueOnce([
      { number: 12, title: "Existing bug", body: "Same crash", htmlUrl: "https://github.com/juniorhamish/chorez/issues/12" },
    ]);
    screenFeedbackReportMock.mockResolvedValueOnce({
      isCoherent: true,
      reason: null,
      title: "App crashes on task completion",
      duplicateIssueNumber: 12,
    });

    const outcome = await submitHelpReport(VALID_MESSAGE);

    expect(commentOnIssueMock).toHaveBeenCalledWith(12, expect.stringContaining(VALID_MESSAGE));
    expect(createIssueMock).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      ok: true,
      result: {
        action: "commented",
        issueNumber: 12,
        issueUrl: "https://github.com/juniorhamish/chorez/issues/12",
      },
    });
  });
});

describe("submitHelpReport - unexpected failures", () => {
  it("never throws, even when something unexpected blows up, and returns a friendly error instead", async () => {
    getDbUserMock.mockRejectedValue(new Error("Minified React error #418; visit https://react.dev/errors/418"));

    const outcome = await submitHelpReport(VALID_MESSAGE);

    expect(outcome).toEqual({ ok: false, error: expect.any(String) });
    expect(outcome.ok && "result" in outcome).toBe(false);
  });
});
