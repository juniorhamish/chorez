export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Formats a millisecond duration as `mm:ss`, or `h:mm:ss` once it runs past an hour. */
export function formatStopwatchTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Formats a 24-hour value (0-23) as a friendly 12-hour clock label, e.g. 8 -> "8:00 AM". */
export function formatHourLabel(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

/**
 * Returns the Monday of the week containing the given date (native Date only,
 * since date-fns is not installed in this project).
 */
export function getStartOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDayDate(date: Date) {
  return `${MONTH_LABELS[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")}`;
}

export function getDayLabel(date: Date) {
  return DAY_LABELS[(date.getDay() + 6) % 7];
}

/** Builds the 7 days (Mon-Sun) for the week starting at `weekStart`. */
export function getWeekDays(weekStart: Date) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return {
      label: DAY_LABELS[i],
      date: formatDayDate(date),
      fullDate: date,
      isToday: isSameDay(date, today),
    };
  });
}
