import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStartOfWeek } from "@/lib/dashboard/date-utils";
import { SELECTED_DAY_SAVED_AT_KEY, useViewPreferences } from "./useViewPreferences";

let setItemSpy: ReturnType<typeof vi.spyOn>;
let cookieSetSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  setItemSpy = vi.spyOn(localStorage, "setItem");
  cookieSetSpy = vi.spyOn(document, "cookie", "set");
});

describe("useViewPreferences", () => {
  it("defaults viewMode to 'mine' when not provided or invalid", () => {
    const { result } = renderHook(() => useViewPreferences({}));
    expect(result.current.viewMode).toBe("mine");
  });

  it("initializes viewMode from initialViewMode when valid", () => {
    const { result } = renderHook(() => useViewPreferences({ initialViewMode: "household" }));
    expect(result.current.viewMode).toBe("household");
  });

  it("initializes currentWeekStart from initialWeekStart, snapped to the Monday of that week", () => {
    const { result } = renderHook(() =>
      useViewPreferences({ initialWeekStart: "2024-06-12T00:00:00" }) // a Wednesday
    );
    expect(result.current.currentWeekStart.getDay()).toBe(1);
    expect(result.current.currentWeekStart.getDate()).toBe(10);
  });

  it("falls back to the current week when initialWeekStart is invalid", () => {
    const { result } = renderHook(() => useViewPreferences({ initialWeekStart: "not-a-date" }));
    expect(result.current.currentWeekStart).toEqual(getStartOfWeek(new Date()));
  });

  it("initializes selectedDay from initialSelectedDay when valid", () => {
    const { result } = renderHook(() =>
      useViewPreferences({ initialSelectedDay: "2024-06-12T00:00:00" })
    );
    expect(result.current.selectedDay).toEqual(new Date("2024-06-12T00:00:00"));
  });

  it("initializes selectedRoom from initialSelectedRoom, defaulting to 'all'", () => {
    const { result: withRoom } = renderHook(() =>
      useViewPreferences({ initialSelectedRoom: "room-1" })
    );
    expect(withRoom.current.selectedRoom).toBe("room-1");

    const { result: withoutRoom } = renderHook(() => useViewPreferences({}));
    expect(withoutRoom.current.selectedRoom).toBe("all");
  });

  it("persists each of the four values to localStorage+cookie on mount", () => {
    setItemSpy.mockClear();
    renderHook(() => useViewPreferences({}));

    expect(setItemSpy).toHaveBeenCalledWith("chorez_view_mode", "mine");
    expect(setItemSpy).toHaveBeenCalledWith("chorez_selected_room", "all");
    // selectedDay writes both its value and the SELECTED_DAY_SAVED_AT_KEY timestamp.
    expect(setItemSpy).toHaveBeenCalledTimes(5);
    expect(cookieSetSpy).toHaveBeenCalledTimes(4);
  });

  it("persists only viewMode to localStorage+cookie when viewMode changes, leaving the other keys' effects from re-running", () => {
    const { result } = renderHook(() => useViewPreferences({}));
    setItemSpy.mockClear();
    cookieSetSpy.mockClear();

    act(() => {
      result.current.setViewMode("household");
    });

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledWith("chorez_view_mode", "household");
    expect(cookieSetSpy).toHaveBeenCalledTimes(1);
    expect(cookieSetSpy).toHaveBeenCalledWith("chorez_view_mode=household; path=/; max-age=31536000");
  });

  it("persists only currentWeekStart to localStorage+cookie when it changes", () => {
    const { result } = renderHook(() => useViewPreferences({}));
    setItemSpy.mockClear();
    cookieSetSpy.mockClear();
    const newWeekStart = getStartOfWeek(new Date("2024-01-01T00:00:00"));

    act(() => {
      result.current.setCurrentWeekStart(newWeekStart);
    });

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledWith("chorez_week_start", newWeekStart.toISOString());
    expect(cookieSetSpy).toHaveBeenCalledTimes(1);
  });

  it("persists only selectedDay to localStorage+cookie when it changes", () => {
    const { result } = renderHook(() => useViewPreferences({}));
    setItemSpy.mockClear();
    cookieSetSpy.mockClear();
    const newDay = new Date("2024-01-02T00:00:00");

    act(() => {
      result.current.setSelectedDay(newDay);
    });

    expect(setItemSpy).toHaveBeenCalledTimes(2);
    expect(setItemSpy).toHaveBeenCalledWith("chorez_selected_day", newDay.toISOString());
    expect(setItemSpy).toHaveBeenCalledWith(SELECTED_DAY_SAVED_AT_KEY, expect.any(String));
    expect(cookieSetSpy).toHaveBeenCalledTimes(1);
  });

  describe("stale selectedDay expiry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-12T09:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("resets selectedDay to today when it was saved on an earlier calendar day", () => {
      localStorage.setItem("chorez_selected_day", new Date("2024-06-11T15:00:00").toISOString());
      localStorage.setItem(SELECTED_DAY_SAVED_AT_KEY, new Date("2024-06-11T15:00:00").toISOString());

      const { result } = renderHook(() =>
        useViewPreferences({ initialSelectedDay: "2024-06-11T15:00:00" })
      );

      expect(result.current.selectedDay).toEqual(new Date("2024-06-12T09:00:00"));
    });

    it("keeps selectedDay when it was saved earlier today", () => {
      localStorage.setItem("chorez_selected_day", new Date("2024-06-12T00:00:00").toISOString());
      localStorage.setItem(SELECTED_DAY_SAVED_AT_KEY, new Date("2024-06-12T00:30:00").toISOString());

      const { result } = renderHook(() =>
        useViewPreferences({ initialSelectedDay: "2024-06-12T00:00:00" })
      );

      expect(result.current.selectedDay).toEqual(new Date("2024-06-12T00:00:00"));
    });

    it("keeps selectedDay when there is no saved-at record", () => {
      localStorage.setItem("chorez_selected_day", new Date("2024-06-11T15:00:00").toISOString());

      const { result } = renderHook(() =>
        useViewPreferences({ initialSelectedDay: "2024-06-11T15:00:00" })
      );

      expect(result.current.selectedDay).toEqual(new Date("2024-06-11T15:00:00"));
    });

    it("keeps selectedDay when the saved-at record is corrupt", () => {
      localStorage.setItem("chorez_selected_day", new Date("2024-06-11T15:00:00").toISOString());
      localStorage.setItem(SELECTED_DAY_SAVED_AT_KEY, "not-a-date");

      const { result } = renderHook(() =>
        useViewPreferences({ initialSelectedDay: "2024-06-11T15:00:00" })
      );

      expect(result.current.selectedDay).toEqual(new Date("2024-06-11T15:00:00"));
    });
  });

  it("persists only selectedRoom to localStorage+cookie when it changes", () => {
    const { result } = renderHook(() => useViewPreferences({}));
    setItemSpy.mockClear();
    cookieSetSpy.mockClear();

    act(() => {
      result.current.setSelectedRoom("room-2");
    });

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledWith("chorez_selected_room", "room-2");
    expect(cookieSetSpy).toHaveBeenCalledTimes(1);
    expect(cookieSetSpy).toHaveBeenCalledWith("chorez_selected_room=room-2; path=/; max-age=31536000");
  });
});
