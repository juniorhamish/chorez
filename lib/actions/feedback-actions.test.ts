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
  it("throws when there is no authenticated user", async () => {
    getDbUserMock.mockResolvedValue(null);
    await expect(submitHelpReport(VALID_MESSAGE)).rejects.toThrow("Not authenticated");
  });

  it("rejects a message that's too short", async () => {
    await expect(submitHelpReport("too short")).rejects.toThrow(/more detail/);
  });

  it("rejects a message that's too long", async () => {
    await expect(submitHelpReport("a".repeat(2001))).rejects.toThrow(/under 2000 characters/);
  });
});

describe("submitHelpReport - rate limiting", () => {
  it("throws when the user has already submitted a report within the rate-limit window", async () => {
    sqlMock.mockResolvedValueOnce([{ count: 1 }]);

    await expect(submitHelpReport(VALID_MESSAGE)).rejects.toThrow(/already submitted a report recently/);
    expect(screenFeedbackReportMock).not.toHaveBeenCalled();
  });

  it("scopes the rate-limit check to the current user", async () => {
    await submitHelpReport(VALID_MESSAGE);

    expect(sqlMock.mock.calls[0]).toContain(DB_USER.id);
  });
});

describe("submitHelpReport - AI screening", () => {
  it("throws with the AI's reason when the report isn't coherent", async () => {
    screenFeedbackReportMock.mockResolvedValueOnce({
      isCoherent: false,
      reason: "This looks like gibberish.",
      title: "",
      duplicateIssueNumber: null,
    });

    await expect(submitHelpReport(VALID_MESSAGE)).rejects.toThrow("This looks like gibberish.");
    expect(createIssueMock).not.toHaveBeenCalled();
    expect(commentOnIssueMock).not.toHaveBeenCalled();
  });

  it("still screens the report even if the GitHub search for candidates fails", async () => {
    searchOpenIssuesMock.mockRejectedValueOnce(new Error("network error"));

    const result = await submitHelpReport(VALID_MESSAGE);

    expect(screenFeedbackReportMock).toHaveBeenCalledWith(VALID_MESSAGE, []);
    expect(result.action).toBe("created");
  });
});

describe("submitHelpReport - GitHub issue creation", () => {
  it("creates a new issue when there is no duplicate, and records the report", async () => {
    const result = await submitHelpReport(VALID_MESSAGE);

    expect(createIssueMock).toHaveBeenCalledWith("App crashes on task completion", expect.stringContaining(VALID_MESSAGE));
    expect(commentOnIssueMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      action: "created",
      issueNumber: 5,
      issueUrl: "https://github.com/juniorhamish/chorez/issues/5",
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

    const result = await submitHelpReport(VALID_MESSAGE);

    expect(commentOnIssueMock).toHaveBeenCalledWith(12, expect.stringContaining(VALID_MESSAGE));
    expect(createIssueMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      action: "commented",
      issueNumber: 12,
      issueUrl: "https://github.com/juniorhamish/chorez/issues/12",
    });
  });
});
