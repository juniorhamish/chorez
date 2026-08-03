import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAddRoomForm } from "./useAddRoomForm";

const DEFAULT_ICON = "home";

describe("useAddRoomForm", () => {
  it("starts with the modal closed and default form values", () => {
    const { result } = renderHook(() => useAddRoomForm(DEFAULT_ICON));

    expect(result.current.isAddRoomOpen).toBe(false);
    expect(result.current.isAddRoomFromTask).toBe(false);
    expect(result.current.newRoomName).toBe("");
    expect(result.current.newRoomIconName).toBe(DEFAULT_ICON);
    expect(result.current.isAddingRoom).toBe(false);
  });

  it("openAddRoom(false) opens the modal, resets the form, and marks it as not opened from a task", () => {
    const { result } = renderHook(() => useAddRoomForm(DEFAULT_ICON));

    act(() => {
      result.current.setNewRoomName("Stale name");
      result.current.setNewRoomIconName("garage");
    });

    act(() => {
      result.current.openAddRoom(false);
    });

    expect(result.current.isAddRoomOpen).toBe(true);
    expect(result.current.isAddRoomFromTask).toBe(false);
    expect(result.current.newRoomName).toBe("");
    expect(result.current.newRoomIconName).toBe(DEFAULT_ICON);
  });

  it("openAddRoom(true) opens the modal and marks it as opened from a task", () => {
    const { result } = renderHook(() => useAddRoomForm(DEFAULT_ICON));

    act(() => {
      result.current.openAddRoom(true);
    });

    expect(result.current.isAddRoomOpen).toBe(true);
    expect(result.current.isAddRoomFromTask).toBe(true);
  });

  it("setIsAddRoomOpen(false) closes the modal", () => {
    const { result } = renderHook(() => useAddRoomForm(DEFAULT_ICON));

    act(() => {
      result.current.openAddRoom(false);
    });
    expect(result.current.isAddRoomOpen).toBe(true);

    act(() => {
      result.current.setIsAddRoomOpen(false);
    });
    expect(result.current.isAddRoomOpen).toBe(false);
  });

  it("setIsAddingRoom tracks the in-flight submission state", () => {
    const { result } = renderHook(() => useAddRoomForm(DEFAULT_ICON));

    act(() => {
      result.current.setIsAddingRoom(true);
    });
    expect(result.current.isAddingRoom).toBe(true);

    act(() => {
      result.current.setIsAddingRoom(false);
    });
    expect(result.current.isAddingRoom).toBe(false);
  });
});
