import type { Task } from "@/lib/dashboard/types";

/**
 * How many days after a task's due date to look for other pending tasks in
 * the same room, to suggest tackling them together.
 */
export const RELATED_TASKS_WINDOW_DAYS = 3;

/** Normalises a Date or date-ish string to a day-granularity timestamp (local time, midnight). */
function toDayTimestamp(value: string | Date): number {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Finds other *pending* tasks in the same room as `task` that fall due
 * within the next `windowDays` days, so they can be suggested as "you're
 * already going to be in this room, want to knock these out too?".
 *
 * Rules:
 * - Only pending tasks are suggested (completed ones are done, nothing to do).
 * - Other instances of the *same* chore are excluded — that's just a future
 *   occurrence of this very task, not a different one worth grouping in.
 * - Tasks whose chore_id is in `excludeChoreIds` are skipped, so callers can
 *   avoid suggesting the same task underneath more than one visible card.
 * - Results are deduped by chore_id, keeping only the soonest upcoming
 *   instance of each chore. This is what keeps a daily/frequent chore (which
 *   may have several pending instances queued up) from being suggested more
 *   than once.
 */
export function getRelatedUpcomingTasks(
  task: Task,
  allTasks: Task[],
  options: { windowDays?: number; excludeChoreIds?: Set<string> } = {}
): Task[] {
  const { windowDays = RELATED_TASKS_WINDOW_DAYS, excludeChoreIds } = options;
  if (!task.room_id || !task.due_date) return [];

  const taskDayMs = toDayTimestamp(task.due_date);
  const windowEndMs = taskDayMs + windowDays * MS_PER_DAY;

  const soonestByChoreId = new Map<string, Task>();

  for (const candidate of allTasks) {
    if (candidate.id === task.id) continue;
    if (candidate.status !== "pending") continue;
    if (candidate.room_id !== task.room_id) continue;
    if (candidate.chore_id === task.chore_id) continue;
    if (excludeChoreIds?.has(candidate.chore_id)) continue;
    if (!candidate.due_date) continue;

    const candidateDayMs = toDayTimestamp(candidate.due_date);
    // Strictly after the current task's day (same-day tasks are already
    // shown as their own cards) and within the suggestion window.
    if (candidateDayMs <= taskDayMs || candidateDayMs > windowEndMs) continue;

    const existing = soonestByChoreId.get(candidate.chore_id);
    if (!existing || candidateDayMs < toDayTimestamp(existing.due_date)) {
      soonestByChoreId.set(candidate.chore_id, candidate);
    }
  }

  return Array.from(soonestByChoreId.values()).sort(
    (a, b) => toDayTimestamp(a.due_date) - toDayTimestamp(b.due_date)
  );
}

/**
 * Finds the most recently completed instance of `choreId`, if any, so its
 * notes/duration/effort can be surfaced as helpful context ("here's what
 * happened last time") for a suggested upcoming task.
 */
export function getLastCompletedInstance(choreId: string, allTasks: Task[]): Task | null {
  let latest: Task | null = null;
  let latestMs = -Infinity;

  for (const candidate of allTasks) {
    if (candidate.chore_id !== choreId) continue;
    if (candidate.status !== "completed" || !candidate.completed_at) continue;

    const completedMs = new Date(candidate.completed_at).getTime();
    if (completedMs > latestMs) {
      latestMs = completedMs;
      latest = candidate;
    }
  }

  return latest;
}

/** Formats how far away a due date is from `fromDate`, e.g. "Today", "Tomorrow", "In 3 days". */
export function formatRelativeDueDate(dueDate: string | Date, fromDate: Date = new Date()): string {
  const diffDays = Math.round((toDayTimestamp(dueDate) - toDayTimestamp(fromDate)) / MS_PER_DAY);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === -1) return "Yesterday";
  return `${Math.abs(diffDays)} days ago`;
}
