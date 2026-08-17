import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const submitHelpReportMock = vi.fn();
vi.mock("@/lib/actions/feedback-actions", () => ({
  submitHelpReport: submitHelpReportMock,
}));

const { useHelpReport } = await import("./useHelpReport");

beforeEach(() => {
  submitHelpReportMock.mockReset();
});

describe("useHelpReport", () => {
  it("starts with the modal closed and empty state", () => {
    const { result } = renderHook(() => useHelpReport());

    expect(result.current.isHelpOpen).toBe(false);
    expect(result.current.reportMessage).toBe("");
    expect(result.current.isSubmittingReport).toBe(false);
    expect(result.current.reportError).toBeNull();
    expect(result.current.reportResult).toBeNull();
  });

  it("openHelp opens the modal and resets stale message/error/result", () => {
    const { result } = renderHook(() => useHelpReport());

    act(() => {
      result.current.setReportMessage("stale message");
      result.current.setReportError("stale error");
    });

    act(() => {
      result.current.openHelp();
    });

    expect(result.current.isHelpOpen).toBe(true);
    expect(result.current.reportMessage).toBe("");
    expect(result.current.reportError).toBeNull();
    expect(result.current.reportResult).toBeNull();
  });

  it("closeHelp closes the modal", () => {
    const { result } = renderHook(() => useHelpReport());

    act(() => result.current.openHelp());
    expect(result.current.isHelpOpen).toBe(true);

    act(() => result.current.closeHelp());
    expect(result.current.isHelpOpen).toBe(false);
  });

  it("does nothing when submitting a blank message", async () => {
    const { result } = renderHook(() => useHelpReport());

    await act(async () => {
      await result.current.submitReport();
    });

    expect(submitHelpReportMock).not.toHaveBeenCalled();
  });

  it("submits the trimmed message and stores the result on success", async () => {
    submitHelpReportMock.mockResolvedValue({
      ok: true,
      result: {
        action: "created",
        issueNumber: 5,
        issueUrl: "https://github.com/juniorhamish/chorez/issues/5",
      },
    });
    const { result } = renderHook(() => useHelpReport());

    act(() => {
      result.current.setReportMessage("  The app crashes on login  ");
    });

    await act(async () => {
      await result.current.submitReport();
    });

    expect(submitHelpReportMock).toHaveBeenCalledWith("The app crashes on login");
    expect(result.current.reportResult).toEqual({
      action: "created",
      issueNumber: 5,
      issueUrl: "https://github.com/juniorhamish/chorez/issues/5",
    });
    expect(result.current.reportError).toBeNull();
    expect(result.current.isSubmittingReport).toBe(false);
  });

  it("stores an error message when submission fails", async () => {
    submitHelpReportMock.mockResolvedValue({
      ok: false,
      error: "This doesn't look like a genuine issue report.",
    });
    const { result } = renderHook(() => useHelpReport());

    act(() => {
      result.current.setReportMessage("asdkjhaskjdh");
    });

    await act(async () => {
      await result.current.submitReport();
    });

    expect(result.current.reportError).toBe("This doesn't look like a genuine issue report.");
    expect(result.current.reportResult).toBeNull();
  });

  it("tracks isSubmittingReport while the request is in flight", async () => {
    let resolveSubmit: (value: unknown) => void;
    submitHelpReportMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSubmit = resolve;
      })
    );
    const { result } = renderHook(() => useHelpReport());

    act(() => {
      result.current.setReportMessage("A genuine report about a real bug");
    });

    act(() => {
      void result.current.submitReport();
    });

    await waitFor(() => expect(result.current.isSubmittingReport).toBe(true));

    await act(async () => {
      resolveSubmit({ ok: true, result: { action: "created", issueNumber: 1, issueUrl: "https://example.com" } });
    });

    expect(result.current.isSubmittingReport).toBe(false);
  });
});
