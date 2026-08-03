import { useEffect, useState } from "react";
import { getStartOfWeek } from "@/lib/dashboard/date-utils";

interface UseViewPreferencesArgs {
  initialViewMode?: 'mine' | 'household';
  initialWeekStart?: string;
  initialSelectedDay?: string;
  initialSelectedRoom?: string;
}

/**
 * Owns the dashboard's view preferences (view mode, selected week/day/room),
 * each initialized from the corresponding `initial*` prop and persisted
 * independently to both localStorage and a cookie (so the server can read it
 * back on the next request) whenever it changes.
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
