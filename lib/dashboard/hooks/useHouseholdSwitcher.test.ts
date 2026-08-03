import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHouseholdSwitcher } from "./useHouseholdSwitcher";

describe("useHouseholdSwitcher", () => {
  it("starts with the menu closed and no household/invitation being acted on", () => {
    const { result } = renderHook(() => useHouseholdSwitcher());

    expect(result.current.isHouseholdMenuOpen).toBe(false);
    expect(result.current.switchingHouseholdId).toBeNull();
    expect(result.current.respondingInvitationId).toBeNull();
  });

  it("setIsHouseholdMenuOpen opens/closes the household switcher menu", () => {
    const { result } = renderHook(() => useHouseholdSwitcher());

    act(() => {
      result.current.setIsHouseholdMenuOpen(true);
    });
    expect(result.current.isHouseholdMenuOpen).toBe(true);

    act(() => {
      result.current.setIsHouseholdMenuOpen(false);
    });
    expect(result.current.isHouseholdMenuOpen).toBe(false);
  });

  it("setSwitchingHouseholdId tracks which household is being switched to", () => {
    const { result } = renderHook(() => useHouseholdSwitcher());

    act(() => {
      result.current.setSwitchingHouseholdId("household-1");
    });
    expect(result.current.switchingHouseholdId).toBe("household-1");

    act(() => {
      result.current.setSwitchingHouseholdId(null);
    });
    expect(result.current.switchingHouseholdId).toBeNull();
  });

  it("setRespondingInvitationId tracks which invitation is being responded to", () => {
    const { result } = renderHook(() => useHouseholdSwitcher());

    act(() => {
      result.current.setRespondingInvitationId("invitation-1");
    });
    expect(result.current.respondingInvitationId).toBe("invitation-1");

    act(() => {
      result.current.setRespondingInvitationId(null);
    });
    expect(result.current.respondingInvitationId).toBeNull();
  });
});
