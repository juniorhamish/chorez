import { describe, expect, it } from "vitest";
import {
  formatDayDate,
  formatHourLabel,
  formatStopwatchTime,
  getDayLabel,
  getStartOfWeek,
  getWeekDays,
  isSameDay,
} from "@/lib/dashboard/date-utils";

describe("getStartOfWeek", () => {
  it("returns the same Monday when given a Monday", () => {
    const monday = new Date("2024-06-10T15:30:00"); // a Monday
    const start = getStartOfWeek(monday);
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(10);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it("rolls back to the previous Monday when given a Sunday", () => {
    const sunday = new Date("2024-06-16T12:00:00"); // a Sunday
    const start = getStartOfWeek(sunday);
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(10);
  });

  it("rolls back to Monday across a month boundary", () => {
    const thursday = new Date("2024-08-01T09:00:00"); // a Thursday
    const start = getStartOfWeek(thursday);
    expect(start.getDay()).toBe(1);
    expect(start.getMonth()).toBe(6); // July (0-indexed)
    expect(start.getDate()).toBe(29);
  });
});

describe("isSameDay", () => {
  it("is true for the same calendar day at different times", () => {
    expect(isSameDay(new Date("2024-06-10T00:00:00"), new Date("2024-06-10T23:59:59"))).toBe(true);
  });

  it("is false for different calendar days", () => {
    expect(isSameDay(new Date("2024-06-10T23:59:59"), new Date("2024-06-11T00:00:00"))).toBe(false);
  });

  it("is false for the same day/month in different years", () => {
    expect(isSameDay(new Date("2023-06-10T12:00:00"), new Date("2024-06-10T12:00:00"))).toBe(false);
  });
});

describe("formatDayDate", () => {
  it("formats a date as 'Mon DD' with a zero-padded day", () => {
    expect(formatDayDate(new Date("2024-01-05T00:00:00"))).toBe("Jan 05");
  });

  it("formats a two-digit day without extra padding", () => {
    expect(formatDayDate(new Date("2024-12-25T00:00:00"))).toBe("Dec 25");
  });
});

describe("getDayLabel", () => {
  it("labels a Monday as 'Mon' (week starts on Monday)", () => {
    expect(getDayLabel(new Date("2024-06-10T00:00:00"))).toBe("Mon");
  });

  it("labels a Sunday as 'Sun' (end of the week)", () => {
    expect(getDayLabel(new Date("2024-06-16T00:00:00"))).toBe("Sun");
  });
});

describe("getWeekDays", () => {
  it("builds 7 days starting from the given Monday, in order", () => {
    const monday = getStartOfWeek(new Date("2024-06-10T00:00:00"));
    const days = getWeekDays(monday);
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.label)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(days[0].date).toBe("Jun 10");
    expect(days[6].date).toBe("Jun 16");
  });

  it("marks exactly the day matching today's date as isToday", () => {
    const today = new Date();
    const monday = getStartOfWeek(today);
    const days = getWeekDays(monday);
    const todays = days.filter((d) => d.isToday);
    expect(todays).toHaveLength(1);
    expect(isSameDay(todays[0].fullDate, today)).toBe(true);
  });
});

describe("formatStopwatchTime", () => {
  it("formats sub-minute durations as mm:ss", () => {
    expect(formatStopwatchTime(5 * 1000)).toBe("00:05");
  });

  it("formats durations under an hour as mm:ss", () => {
    expect(formatStopwatchTime((5 * 60 + 9) * 1000)).toBe("05:09");
  });

  it("switches to h:mm:ss once past one hour", () => {
    expect(formatStopwatchTime((60 * 60 + 5 * 60 + 9) * 1000)).toBe("1:05:09");
  });

  it("formats multi-hour durations correctly", () => {
    expect(formatStopwatchTime((2 * 3600 + 3 * 60 + 4) * 1000)).toBe("2:03:04");
  });

  it("formats zero as 00:00", () => {
    expect(formatStopwatchTime(0)).toBe("00:00");
  });
});

describe("formatHourLabel", () => {
  it("formats midnight (hour 0) as 12:00 AM", () => {
    expect(formatHourLabel(0)).toBe("12:00 AM");
  });

  it("formats noon (hour 12) as 12:00 PM", () => {
    expect(formatHourLabel(12)).toBe("12:00 PM");
  });

  it("formats an afternoon hour (13) as 1:00 PM", () => {
    expect(formatHourLabel(13)).toBe("1:00 PM");
  });

  it("formats the last hour of the day (23) as 11:00 PM", () => {
    expect(formatHourLabel(23)).toBe("11:00 PM");
  });

  it("formats a morning hour (8) as 8:00 AM", () => {
    expect(formatHourLabel(8)).toBe("8:00 AM");
  });
});
