import { describe, expect, it } from "vitest";
import {
  addDaysToDateStr,
  calculateNextDueDate,
  clampDueDateToToday,
  computeRescheduleShifts,
  daysBetweenDateStrs,
  formatDateInTz,
  getMissingRecurringDates,
  isMoreFrequentThanWeekly,
  toDateStr,
} from "@/lib/scheduling";

describe("isMoreFrequentThanWeekly", () => {
  it("is true for daily", () => {
    expect(isMoreFrequentThanWeekly("daily", null)).toBe(true);
  });

  it("is true for every-x-days with an interval below 7", () => {
    expect(isMoreFrequentThanWeekly("every-x-days", 3)).toBe(true);
  });

  it("defaults every-x-days interval to 1 when null/undefined", () => {
    expect(isMoreFrequentThanWeekly("every-x-days", null)).toBe(true);
    expect(isMoreFrequentThanWeekly("every-x-days", undefined)).toBe(true);
  });

  it("is false for every-x-days with an interval of 7 or more", () => {
    expect(isMoreFrequentThanWeekly("every-x-days", 7)).toBe(false);
    expect(isMoreFrequentThanWeekly("every-x-days", 10)).toBe(false);
  });

  it("is false for weekly, monthly, yearly, every-x-weeks and on-demand", () => {
    expect(isMoreFrequentThanWeekly("weekly", null)).toBe(false);
    expect(isMoreFrequentThanWeekly("monthly", null)).toBe(false);
    expect(isMoreFrequentThanWeekly("yearly", null)).toBe(false);
    expect(isMoreFrequentThanWeekly("every-x-weeks", 1)).toBe(false);
    expect(isMoreFrequentThanWeekly("on-demand", null)).toBe(false);
  });
});

describe("calculateNextDueDate", () => {
  const from = new Date("2024-01-15T00:00:00.000Z");

  it("adds 1 day for daily", () => {
    expect(toDateStr(calculateNextDueDate(from, "daily", null))).toBe("2024-01-16");
  });

  it("adds 7 days for weekly", () => {
    expect(toDateStr(calculateNextDueDate(from, "weekly", null))).toBe("2024-01-22");
  });

  it("adds 1 month for monthly", () => {
    expect(toDateStr(calculateNextDueDate(from, "monthly", null))).toBe("2024-02-15");
  });

  it("adds 1 year for yearly", () => {
    expect(toDateStr(calculateNextDueDate(from, "yearly", null))).toBe("2025-01-15");
  });

  it("adds the frequency interval (or defaults to 1) for every-x-days", () => {
    expect(toDateStr(calculateNextDueDate(from, "every-x-days", 4))).toBe("2024-01-19");
    expect(toDateStr(calculateNextDueDate(from, "every-x-days", null))).toBe("2024-01-16");
  });

  it("adds the frequency interval in weeks (or defaults to 1) for every-x-weeks", () => {
    expect(toDateStr(calculateNextDueDate(from, "every-x-weeks", 2))).toBe("2024-01-29");
    expect(toDateStr(calculateNextDueDate(from, "every-x-weeks", null))).toBe("2024-01-22");
  });

  it("defaults to the next day for on-demand", () => {
    expect(toDateStr(calculateNextDueDate(from, "on-demand", null))).toBe("2024-01-16");
  });

  it("rolls over month/year boundaries correctly", () => {
    const endOfMonth = new Date("2024-01-31T00:00:00.000Z");
    expect(toDateStr(calculateNextDueDate(endOfMonth, "daily", null))).toBe("2024-02-01");

    const endOfYear = new Date("2024-12-31T00:00:00.000Z");
    expect(toDateStr(calculateNextDueDate(endOfYear, "weekly", null))).toBe("2025-01-07");
  });
});

describe("clampDueDateToToday", () => {
  it("leaves a due date that is today or in the future untouched", () => {
    expect(clampDueDateToToday("2024-06-15", "2024-06-15")).toBe("2024-06-15");
    expect(clampDueDateToToday("2024-06-20", "2024-06-15")).toBe("2024-06-20");
  });

  it("clamps a due date that is in the past up to today", () => {
    expect(clampDueDateToToday("2024-01-01", "2024-06-15")).toBe("2024-06-15");
    expect(clampDueDateToToday(new Date("2024-01-01T00:00:00.000Z"), "2024-06-15")).toBe("2024-06-15");
  });

  it("defaults todayStr to the current date when not provided", () => {
    const pastDate = new Date("2000-01-01T00:00:00.000Z");
    expect(clampDueDateToToday(pastDate)).toBe(toDateStr(new Date()));
  });
});

describe("toDateStr", () => {
  it("formats a Date as YYYY-MM-DD", () => {
    expect(toDateStr(new Date("2024-03-05T13:45:00.000Z"))).toBe("2024-03-05");
  });

  it("normalises a timestamp string to YYYY-MM-DD", () => {
    expect(toDateStr("2024-03-05T13:45:00.000Z")).toBe("2024-03-05");
  });

  it("passes through an already-plain date string", () => {
    expect(toDateStr("2024-03-05")).toBe("2024-03-05");
  });
});

describe("addDaysToDateStr", () => {
  it("adds days within the same month", () => {
    expect(addDaysToDateStr("2024-03-05", 3)).toBe("2024-03-08");
  });

  it("rolls over a month boundary", () => {
    expect(addDaysToDateStr("2024-01-31", 1)).toBe("2024-02-01");
  });

  it("rolls over a year boundary", () => {
    expect(addDaysToDateStr("2024-12-31", 1)).toBe("2025-01-01");
  });

  it("handles a leap-year February correctly", () => {
    expect(addDaysToDateStr("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDaysToDateStr("2024-02-29", 1)).toBe("2024-03-01");
  });
});

describe("daysBetweenDateStrs", () => {
  it("returns a positive number when `to` is after `from`", () => {
    expect(daysBetweenDateStrs("2024-03-01", "2024-03-05")).toBe(4);
  });

  it("returns a negative number when `to` is before `from`", () => {
    expect(daysBetweenDateStrs("2024-03-05", "2024-03-01")).toBe(-4);
  });

  it("returns zero for the same date", () => {
    expect(daysBetweenDateStrs("2024-03-05", "2024-03-05")).toBe(0);
  });

  it("handles month/year boundaries", () => {
    expect(daysBetweenDateStrs("2024-01-31", "2024-02-01")).toBe(1);
    expect(daysBetweenDateStrs("2024-12-31", "2025-01-01")).toBe(1);
  });
});

describe("computeRescheduleShifts", () => {
  const TODAY = "2024-06-15";

  it("moves a single overdue instance to today", () => {
    const shifts = computeRescheduleShifts(
      [{ id: "a1", chore_id: "chore-1", due_date: "2024-06-13" }],
      TODAY
    );
    expect(Object.fromEntries(shifts)).toEqual({ a1: TODAY });
  });

  it("shifts subsequent pending instances of the same chore forward by the same delta, preserving spacing", () => {
    // chore-1 is every-x-days=2: was due 06-13 (2 days overdue), with
    // further instances already generated for 06-15 and 06-17.
    const shifts = computeRescheduleShifts(
      [
        { id: "overdue", chore_id: "chore-1", due_date: "2024-06-13" },
        { id: "next", chore_id: "chore-1", due_date: "2024-06-15" },
        { id: "next-next", chore_id: "chore-1", due_date: "2024-06-17" },
      ],
      TODAY
    );

    // overdue moves to today (a 2-day shift), and both later instances
    // shift forward by that same 2 days, keeping the original 2-day gaps.
    expect(Object.fromEntries(shifts)).toEqual({
      overdue: "2024-06-15",
      next: "2024-06-17",
      "next-next": "2024-06-19",
    });
  });

  it("does not touch instances of a chore that has no overdue instance", () => {
    const shifts = computeRescheduleShifts(
      [
        { id: "future-1", chore_id: "chore-2", due_date: "2024-06-16" },
        { id: "future-2", chore_id: "chore-2", due_date: "2024-06-18" },
      ],
      TODAY
    );
    expect(shifts.size).toBe(0);
  });

  it("leaves other chores in the same batch unaffected", () => {
    const shifts = computeRescheduleShifts(
      [
        { id: "overdue", chore_id: "chore-1", due_date: "2024-06-10" },
        { id: "next", chore_id: "chore-1", due_date: "2024-06-20" },
        { id: "unrelated", chore_id: "chore-2", due_date: "2024-06-22" },
      ],
      TODAY
    );

    expect(shifts.get("overdue")).toBe(TODAY);
    // 5-day shift (06-10 -> 06-15) applied to chore-1's later instance only.
    expect(shifts.get("next")).toBe("2024-06-25");
    expect(shifts.has("unrelated")).toBe(false);
  });

  it("handles multiple independent chores each with their own overdue instance", () => {
    const shifts = computeRescheduleShifts(
      [
        { id: "c1-overdue", chore_id: "chore-1", due_date: "2024-06-14" },
        { id: "c1-next", chore_id: "chore-1", due_date: "2024-06-16" },
        { id: "c2-overdue", chore_id: "chore-2", due_date: "2024-06-12" },
        { id: "c2-next", chore_id: "chore-2", due_date: "2024-06-19" },
      ],
      TODAY
    );

    expect(shifts.get("c1-overdue")).toBe(TODAY);
    expect(shifts.get("c1-next")).toBe("2024-06-17"); // +1 day
    expect(shifts.get("c2-overdue")).toBe(TODAY);
    expect(shifts.get("c2-next")).toBe("2024-06-22"); // +3 days
  });

  it("treats a due date of today as not overdue and leaves it untouched when there's no other overdue instance", () => {
    const shifts = computeRescheduleShifts(
      [{ id: "today-task", chore_id: "chore-1", due_date: TODAY }],
      TODAY
    );
    expect(shifts.size).toBe(0);
  });

  it("returns an empty map for an empty input", () => {
    expect(computeRescheduleShifts([], TODAY).size).toBe(0);
  });
});

describe("formatDateInTz", () => {
  it("formats midnight UTC in a timezone behind UTC as the previous day", () => {
    const midnightUtc = new Date("2024-06-15T00:00:00.000Z");
    expect(formatDateInTz(midnightUtc, "America/New_York")).toBe("2024-06-14");
  });

  it("formats the same instant differently depending on timezone", () => {
    const instant = new Date("2024-06-15T23:30:00.000Z");
    expect(formatDateInTz(instant, "Europe/London")).toBe("2024-06-16");
    expect(formatDateInTz(instant, "America/Los_Angeles")).toBe("2024-06-15");
  });
});

describe("getMissingRecurringDates", () => {
  it("returns an empty list for chores that are not more frequent than weekly", () => {
    expect(
      getMissingRecurringDates("weekly", null, null, new Date("2024-01-01"), "2024-01-01")
    ).toEqual([]);
    expect(
      getMissingRecurringDates("on-demand", null, null, new Date("2024-01-01"), "2024-01-01")
    ).toEqual([]);
  });

  it("seeds from fallbackAnchorDate when there is no known due date yet (daily)", () => {
    const dates = getMissingRecurringDates(
      "daily",
      null,
      null,
      new Date("2024-01-01T00:00:00.000Z"),
      "2024-01-01"
    );
    // fallback anchor is Jan 1st, so the first candidate is Jan 2nd, then every day
    // up to today (Jan 1st) + 13 days = Jan 14th.
    expect(dates[0]).toBe("2024-01-02");
    expect(dates[dates.length - 1]).toBe("2024-01-14");
    expect(dates).toHaveLength(13);
  });

  it("continues from the day after the latest known due date", () => {
    const dates = getMissingRecurringDates(
      "daily",
      null,
      "2024-01-05",
      new Date("2024-01-01T00:00:00.000Z"),
      "2024-01-01"
    );
    expect(dates[0]).toBe("2024-01-06");
    expect(dates[dates.length - 1]).toBe("2024-01-14");
  });

  it("steps by the frequency interval for every-x-days", () => {
    const dates = getMissingRecurringDates(
      "every-x-days",
      3,
      "2024-01-01",
      new Date("2024-01-01T00:00:00.000Z"),
      "2024-01-01"
    );
    expect(dates).toEqual(["2024-01-04", "2024-01-07", "2024-01-10", "2024-01-13"]);
  });

  it("skips dates strictly before today", () => {
    const dates = getMissingRecurringDates(
      "daily",
      null,
      "2023-12-20",
      new Date("2023-12-01T00:00:00.000Z"),
      "2024-01-01"
    );
    expect(dates[0]).toBe("2024-01-01");
    dates.forEach((d) => expect(d >= "2024-01-01").toBe(true));
  });
});
