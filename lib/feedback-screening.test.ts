import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screenFeedbackReport } from "./feedback-screening";

const fetchMock = vi.fn();

function mockGeminiResponse(body: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }],
      }),
      { status: 200 }
    )
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.GEMINI_API_KEY = "test-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
});

describe("screenFeedbackReport", () => {
  it("throws when GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(screenFeedbackReport("The app crashes on login", [])).rejects.toThrow("GEMINI_API_KEY is not set");
  });

  it("returns a coherent result with a title and no duplicate", async () => {
    mockGeminiResponse({ isCoherent: true, title: "App crashes on login", duplicateIssueNumber: null });

    const result = await screenFeedbackReport("The app crashes every time I try to log in", []);

    expect(result).toEqual({
      isCoherent: true,
      reason: null,
      title: "App crashes on login",
      duplicateIssueNumber: null,
    });
  });

  it("surfaces the rejection reason when the report isn't coherent", async () => {
    mockGeminiResponse({ isCoherent: false, reason: "This looks like random keyboard mashing." });

    const result = await screenFeedbackReport("asdkjhaskjdh askjdh", []);

    expect(result.isCoherent).toBe(false);
    expect(result.reason).toBe("This looks like random keyboard mashing.");
  });

  it("only accepts a duplicateIssueNumber that matches one of the candidate issues", async () => {
    mockGeminiResponse({ isCoherent: true, title: "Dark mode broken", duplicateIssueNumber: 999 });

    const result = await screenFeedbackReport("Dark mode text is unreadable", [
      { number: 12, title: "Dark mode contrast issue", body: "Text is hard to read in dark mode" },
    ]);

    // 999 was never offered as a candidate, so it must be discarded rather
    // than trusted at face value (guards against a hallucinated match).
    expect(result.duplicateIssueNumber).toBeNull();
  });

  it("accepts a duplicateIssueNumber that matches a real candidate", async () => {
    mockGeminiResponse({ isCoherent: true, title: "Dark mode broken", duplicateIssueNumber: 12 });

    const result = await screenFeedbackReport("Dark mode text is unreadable", [
      { number: 12, title: "Dark mode contrast issue", body: "Text is hard to read in dark mode" },
    ]);

    expect(result.duplicateIssueNumber).toBe(12);
  });

  it("throws when Gemini returns no content", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [] }), { status: 200 }));

    await expect(screenFeedbackReport("A genuine report", [])).rejects.toThrow("Gemini API returned no content");
  });

  it("throws when the Gemini API request fails", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Server error", { status: 500 }));

    await expect(screenFeedbackReport("A genuine report", [])).rejects.toThrow(/500/);
  });
});
