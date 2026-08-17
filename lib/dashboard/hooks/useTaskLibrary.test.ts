import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTaskLibrary } from "./useTaskLibrary";

describe("useTaskLibrary", () => {
  it("starts closed with the room filter defaulted to 'all'", () => {
    const { result } = renderHook(() => useTaskLibrary());

    expect(result.current.isTaskLibraryOpen).toBe(false);
    expect(result.current.selectedLibraryRoom).toBe("all");
  });

  it("openTaskLibrary opens the overlay", () => {
    const { result } = renderHook(() => useTaskLibrary());

    act(() => {
      result.current.openTaskLibrary();
    });

    expect(result.current.isTaskLibraryOpen).toBe(true);
  });

  it("setIsTaskLibraryOpen(false) closes the overlay", () => {
    const { result } = renderHook(() => useTaskLibrary());

    act(() => {
      result.current.openTaskLibrary();
    });
    expect(result.current.isTaskLibraryOpen).toBe(true);

    act(() => {
      result.current.setIsTaskLibraryOpen(false);
    });
    expect(result.current.isTaskLibraryOpen).toBe(false);
  });

  it("setSelectedLibraryRoom updates the room filter independently of any calendar-view state", () => {
    const { result } = renderHook(() => useTaskLibrary());

    act(() => {
      result.current.setSelectedLibraryRoom("room-1");
    });

    expect(result.current.selectedLibraryRoom).toBe("room-1");
  });
});
