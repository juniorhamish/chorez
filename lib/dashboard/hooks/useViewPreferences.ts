import { useEffect, useState } from "react";
import { getStartOfWeek, isSameDay } from "@/lib/dashboard/date-utils";

interface UseViewPreferencesArgs {
  initialViewMode?: 'mine' | 'household';
  initialWeekStart?: string;
  initialSelectedDay?: string;
  initialSelectedRoom?: string;
}

/** localStorage key recording when `chorez_selected_day` was last written, so a stale selection (from a previous day) can be told apart from a fresh one. */
const SELECTED_DAY_SAVED_AT_KEY = 'chorez_selected_day_saved_at';

/**
 * Owns the dashboard's view preferences (view mode, selected week/day/room),
 * each initialized from the corresponding `initial*` prop and persisted
 * independently to both localStorage and a cookie (so the server can read it
 * back on the next request) whenever it changes. The selected day is the
 * exception: it's only honoured while it was saved earlier on the current
 * (browser-local) calendar day, otherwise it's reset to today on mount.
 */
export function useViewPreferences({
  initialViewMode,
  initialWeekStart,
  initialSelectedDay,
  initialSelectedRoom,
}: UseViewPreferencesArgs) {
  const [viewMode, setViewMode] = useState<'mine' | 'household'>(() => {
    if (initialViewMode === 'mine' || initialViewMode === 'household') return initialViewMode;
    return 'mine';
  });
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    if (initialWeekStart) {
      try {
        const d = new Date(initialWeekStart);
        if (!Number.isNaN(d.getTime())) return getStartOfWeek(d);
      } catch {}
    }
    return getStartOfWeek(new Date());
  });
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    if (initialSelectedDay) {
      try {
        const d = new Date(initialSelectedDay);
        if (!Number.isNaN(d.getTime())) return d;
      } catch {}
    }
    return new Date();
  });
  const [selectedRoom, setSelectedRoom] = useState(() => initialSelectedRoom || "all");

  // If the persisted selection was last written on an earlier calendar day
  // (in the browser's own timezone) than today, it's stale — e.g. the user
  // was looking at yesterday's chores and is now opening the app on a new
  // day, so today should be selected automatically instead. Left alone if it
  // was saved earlier today, or if there's no record of when it was saved
  // (e.g. a pre-existing selection from before this check existed).
  useEffect(() => {
    try {
      const savedAtRaw = localStorage.getItem(SELECTED_DAY_SAVED_AT_KEY);
      if (!savedAtRaw) return;
      const savedAt = new Date(savedAtRaw);
      if (Number.isNaN(savedAt.getTime())) return;
      if (!isSameDay(savedAt, new Date())) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedDay(new Date());
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('chorez_view_mode', viewMode);
      document.cookie = `chorez_view_mode=${viewMode}; path=/; max-age=31536000`;
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem('chorez_week_start', currentWeekStart.toISOString());
      document.cookie = `chorez_week_start=${currentWeekStart.toISOString()}; path=/; max-age=31536000`;
    } catch {}
  }, [currentWeekStart]);

  useEffect(() => {
    try {
      localStorage.setItem('chorez_selected_day', selectedDay.toISOString());
      localStorage.setItem(SELECTED_DAY_SAVED_AT_KEY, new Date().toISOString());
      document.cookie = `chorez_selected_day=${selectedDay.toISOString()}; path=/; max-age=31536000`;
    } catch {}
  }, [selectedDay]);

  useEffect(() => {
    try {
      localStorage.setItem('chorez_selected_room', selectedRoom);
      document.cookie = `chorez_selected_room=${selectedRoom}; path=/; max-age=31536000`;
    } catch {}
  }, [selectedRoom]);

  return {
    viewMode,
    setViewMode,
    currentWeekStart,
    setCurrentWeekStart,
    selectedDay,
    setSelectedDay,
    selectedRoom,
    setSelectedRoom,
  };
}

export { SELECTED_DAY_SAVED_AT_KEY };
