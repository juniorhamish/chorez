import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useManageHousehold } from "./useManageHousehold";

describe("useManageHousehold", () => {
  it("starts with the modal closed and no member being removed", () => {
    const { result } = renderHook(() => useManageHousehold());

    expect(result.current.isManageHouseholdOpen).toBe(false);
    expect(result.current.removingMemberId).toBeNull();
    expect(result.current.removeMemberError).toBeNull();
  });

  it("openManageHousehold opens the modal and resets the error", () => {
    const { result } = renderHook(() => useManageHousehold());

    act(() => {
      result.current.setRemoveMemberError("stale error");
    });

    act(() => {
      result.current.openManageHousehold();
    });

    expect(result.current.isManageHouseholdOpen).toBe(true);
    expect(result.current.removeMemberError).toBeNull();
  });

  it("setIsManageHouseholdOpen(false) closes the modal", () => {
    const { result } = renderHook(() => useManageHousehold());

    act(() => {
      result.current.openManageHousehold();
    });
    expect(result.current.isManageHouseholdOpen).toBe(true);

    act(() => {
      result.current.setIsManageHouseholdOpen(false);
    });
    expect(result.current.isManageHouseholdOpen).toBe(false);
  });

  it("setRemovingMemberId tracks which member is being removed", () => {
    const { result } = renderHook(() => useManageHousehold());

    act(() => {
      result.current.setRemovingMemberId("member-1");
    });
    expect(result.current.removingMemberId).toBe("member-1");

    act(() => {
      result.current.setRemovingMemberId(null);
    });
    expect(result.current.removingMemberId).toBeNull();
  });

  it("setRemoveMemberError tracks the latest removal error", () => {
    const { result } = renderHook(() => useManageHousehold());

    act(() => {
      result.current.setRemoveMemberError("Only admins can remove members");
    });
    expect(result.current.removeMemberError).toBe("Only admins can remove members");
  });
});
