import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useInviteMember } from "./useInviteMember";

describe("useInviteMember", () => {
  it("starts with the modal closed and default form values", () => {
    const { result } = renderHook(() => useInviteMember());

    expect(result.current.isInviteOpen).toBe(false);
    expect(result.current.inviteEmail).toBe("");
    expect(result.current.isInviting).toBe(false);
    expect(result.current.inviteError).toBeNull();
  });

  it("openInviteMember opens the modal and resets the email + error", () => {
    const { result } = renderHook(() => useInviteMember());

    act(() => {
      result.current.setInviteEmail("stale@example.com");
      result.current.setInviteError("stale error");
    });

    act(() => {
      result.current.openInviteMember();
    });

    expect(result.current.isInviteOpen).toBe(true);
    expect(result.current.inviteEmail).toBe("");
    expect(result.current.inviteError).toBeNull();
  });

  it("setIsInviteOpen(false) closes the modal", () => {
    const { result } = renderHook(() => useInviteMember());

    act(() => {
      result.current.openInviteMember();
    });
    expect(result.current.isInviteOpen).toBe(true);

    act(() => {
      result.current.setIsInviteOpen(false);
    });
    expect(result.current.isInviteOpen).toBe(false);
  });

  it("setIsInviting and setInviteError track the in-flight request state", () => {
    const { result } = renderHook(() => useInviteMember());

    act(() => {
      result.current.setIsInviting(true);
    });
    expect(result.current.isInviting).toBe(true);

    act(() => {
      result.current.setIsInviting(false);
      result.current.setInviteError("Something went wrong");
    });
    expect(result.current.isInviting).toBe(false);
    expect(result.current.inviteError).toBe("Something went wrong");
  });
});
