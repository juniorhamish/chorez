import { sql } from "@/lib/db";

export type ChoreFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'every-x-days'
  | 'every-x-weeks'
  | 'on-demand';

// How many days ahead (from today) the rolling schedule for sub-weekly
// recurring chores (daily / every-x-days) should be kept populated with
// pending instances. 13 => today + the next 13 days = a 2 week window.
export const RECURRING_SCHEDULE_HORIZON_DAYS = 13;

/**
 * Chores that recur more frequently than once a week need one instance per
 * occurrence within the current schedule horizon (e.g. a daily task should
 * have an instance for every day of the week), rather than a single "next"
 * instance, so the optimiser/household can assign a different person each
 * time it comes up.
 */
export function isMoreFrequentThanWeekly(
  frequency: ChoreFrequency,
  frequencyInterval: number | null | undefined
): boolean {
  if (frequency === 'daily') return true;
  if (frequency === 'every-x-days') return (frequencyInterval ?? 1) < 7;
  return false;
}

export function calculateNextDueDate(
  fromDate: Date,
  frequency: ChoreFrequency,
  frequencyInterval: number | null | undefined
): Date {
  const nextDate = new Date(fromDate);

  if (frequency === 'daily') nextDate.setDate(fromDate.getDate() + 1);
  else if (frequency === 'weekly') nextDate.setDate(fromDate.getDate() + 7);
  else if (frequency === 'monthly') nextDate.setMonth(fromDate.getMonth() + 1);
  else if (frequency === 'yearly') nextDate.setFullYear(fromDate.getFullYear() + 1);
  else if (frequency === 'every-x-days') nextDate.setDate(fromDate.getDate() + (frequencyInterval || 1));
  else if (frequency === 'every-x-weeks') nextDate.setDate(fromDate.getDate() + (frequencyInterval || 1) * 7);
  else nextDate.setDate(fromDate.getDate() + 1); // Default to next day for on-demand initial? Or same day.

  return nextDate;
}

/** Normalises a Date or a "YYYY-MM-DD"/timestamp string into a "YYYY-MM-DD" string. */
export function toDateStr(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).split('T')[0];
}

/** Adds a number of whole days to a "YYYY-MM-DD" string, returning a "YYYY-MM-DD" string. */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

/** Formats a Date as "YYYY-MM-DD" in the given IANA timezone. */
export function formatDateInTz(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Given a recurring chore that is more frequent than weekly, computes every
 * occurrence date, from the day after the latest date already known for
 * this chore (or, if none exists yet, from `fallbackAnchorDate`), up to the
 * end of the rolling schedule horizon (today + RECURRING_SCHEDULE_HORIZON_DAYS,
 * in the household's timezone).
 *
 * Dates strictly before "today" are skipped (they would immediately be
 * overdue); this also means the function is safe to call repeatedly without
 * ever regenerating dates that are already in the past.
 */
export function getMissingRecurringDates(
  frequency: ChoreFrequency,
  frequencyInterval: number | null | undefined,
  latestKnownDueDate: string | null,
  fallbackAnchorDate: Date,
  todayStr: string
): string[] {
  if (!isMoreFrequentThanWeekly(frequency, frequencyInterval)) return [];

  const stepDays = frequency === 'daily' ? 1 : (frequencyInterval || 1);
  const horizonEndStr = addDaysToDateStr(todayStr, RECURRING_SCHEDULE_HORIZON_DAYS);

  let candidate = latestKnownDueDate
    ? addDaysToDateStr(toDateStr(latestKnownDueDate), stepDays)
    : toDateStr(calculateNextDueDate(fallbackAnchorDate, frequency, frequencyInterval));

  const dates: string[] = [];
  while (candidate <= horizonEndStr) {
    if (candidate >= todayStr) dates.push(candidate);
    candidate = addDaysToDateStr(candidate, stepDays);
  }

  return dates;
}

/**
 * Ensures a chore that recurs more frequently than weekly has a pending
 * instance for every occurrence between today and the end of the rolling
 * schedule horizon (in the household's timezone), creating any that are
 * missing. Does nothing for chores that recur weekly or less often (those
 * keep the single "next instance" behaviour) or that are 'on-demand'.
 *
 * `fallbackAnchorDate` is only used to seed the very first occurrence when
 * the chore has no existing chore_assignments rows at all yet.
 *
 * Returns the list of due dates ("YYYY-MM-DD") that were newly created.
 */
export async function ensureUpcomingInstances(
  choreId: string,
  householdId: string,
  frequency: ChoreFrequency,
  frequencyInterval: number | null | undefined,
  fallbackAnchorDate: Date
): Promise<string[]> {
  if (!isMoreFrequentThanWeekly(frequency, frequencyInterval)) return [];

  const household = (await sql`
    SELECT timezone FROM households WHERE id = ${householdId}
  `)[0];
  const tz = (household?.timezone as string) || "Europe/London";
  const todayStr = formatDateInTz(new Date(), tz);

  const maxRow = (await sql`
    SELECT MAX(due_date) as max_due_date FROM chore_assignments WHERE chore_id = ${choreId}
  `)[0];
  const latestKnownDueDate = maxRow?.max_due_date ? toDateStr(maxRow.max_due_date as string | Date) : null;

  const datesToInsert = getMissingRecurringDates(
    frequency,
    frequencyInterval,
    latestKnownDueDate,
    fallbackAnchorDate,
    todayStr
  );

  const created: string[] = [];
  for (const dateStr of datesToInsert) {
    const inserted = await sql`
      INSERT INTO chore_assignments (chore_id, household_id, due_date, status)
      VALUES (${choreId}, ${householdId}, ${dateStr}::date, 'pending')
      ON CONFLICT (chore_id, due_date) DO NOTHING
      RETURNING id
    `;
    if (inserted.length > 0) created.push(dateStr);
  }

  return created;
}

/**
 * Runs `ensureUpcomingInstances` for every sub-weekly recurring chore
 * ('daily' or 'every-x-days') in a household. Meant to be called from the
 * daily reschedule cron job so the rolling schedule stays populated even on
 * days nobody completes a task or adds a new chore.
 *
 * Returns the total number of newly created chore_assignments rows.
 */
export async function ensureUpcomingInstancesForHousehold(householdId: string): Promise<number> {
  const chores = await sql`
    SELECT id, frequency, frequency_interval
    FROM chores
    WHERE household_id = ${householdId} AND frequency IN ('daily', 'every-x-days')
  `;

  let totalCreated = 0;
  for (const chore of chores) {
    const frequency = chore.frequency as ChoreFrequency;
    const frequencyInterval = chore.frequency_interval as number | null;
    if (!isMoreFrequentThanWeekly(frequency, frequencyInterval)) continue;

    const created = await ensureUpcomingInstances(
      chore.id as string,
      householdId,
      frequency,
      frequencyInterval,
      new Date()
    );
    totalCreated += created.length;
  }

  return totalCreated;
}
