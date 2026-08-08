// Shared logic to run the Gemini-powered weekly schedule optimization for a
// single household: gathering the household's data, asking Gemini for a list
// of actions, validating + applying them, and reporting a detailed result.
//
// Used by both the admin-triggered dashboard action (lib/actions/schedule-optimization-actions.ts)
// and the scheduled cron job (app/api/cron/optimize-schedule/route.ts), so the
// two entry points can never drift apart.

import { sql } from "@/lib/db";
import { getScheduleOptimizationActions, type HouseholdOptimizationPayload, type ScheduleAction } from "@/lib/gemini";

export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

export function isValidDateStr(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDateStr(value: unknown): string {
  return value instanceof Date ? value.toISOString().split("T")[0] : String(value ?? "");
}

export type AppliedActionResult =
  | {
      type: "assign";
      assignmentId: string;
      chore: string;
      room: string | null;
      previousUserId: string | null;
      newUserId: string | null;
      reason?: string;
    }
  | {
      type: "reschedule";
      assignmentId: string;
      chore: string;
      room: string | null;
      previousDueDate: string;
      newDueDate: string;
      reason?: string;
    };

export interface HouseholdOptimizationResult {
  householdId: string;
  householdName: string;
  weekStart: string;
  weekEnd: string;
  tasksConsidered: number;
  actionsProposed: number;
  actionsApplied: number;
  appliedActions: AppliedActionResult[];
  skippedActions: Array<{ action: ScheduleAction; reason: string }>;
  error?: string;
}

export async function optimizeHousehold(
  household: { id: string; name: string; timezone: string | null },
  dryRun: boolean
): Promise<HouseholdOptimizationResult> {
  const tz = household.timezone || "Europe/London";
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const weekStart = today;
  const weekEnd = addDays(today, 6);

  const result: HouseholdOptimizationResult = {
    householdId: household.id,
    householdName: household.name,
    weekStart,
    weekEnd,
    tasksConsidered: 0,
    actionsProposed: 0,
    actionsApplied: 0,
    appliedActions: [],
    skippedActions: [],
  };

  // 1. Users in this household.
  const users = await sql`
    SELECT u.id, u.full_name
    FROM users u
    JOIN household_members hm ON u.id = hm.user_id
    WHERE hm.household_id = ${household.id}
  `;

  if (users.length === 0) {
    return result;
  }
  const validUserIds = new Set(users.map((u) => u.id as string));

  // 2. Upcoming week's pending tasks for this household. Private tasks
  // (chores.private_to_user_id set) are excluded entirely: they belong to a
  // single user, are never visible to the rest of the household, and must
  // never be reassigned or rescheduled by the optimiser.
  const upcomingTasks = await sql`
    SELECT
      ca.id,
      ca.chore_id,
      ca.assigned_user_id,
      ca.due_date,
      c.title,
      c.estimated_duration_minutes,
      r.name AS room_name
    FROM chore_assignments ca
    JOIN chores c ON ca.chore_id = c.id
    LEFT JOIN rooms r ON c.room_id = r.id
    WHERE ca.household_id = ${household.id}
      AND ca.status = 'pending'
      AND ca.due_date >= ${weekStart}::date
      AND ca.due_date <= ${weekEnd}::date
      AND c.private_to_user_id IS NULL
    ORDER BY ca.due_date ASC
  `;

  result.tasksConsidered = upcomingTasks.length;

  if (upcomingTasks.length === 0) {
    return result;
  }
  const validAssignmentIds = new Set(upcomingTasks.map((t) => t.id as string));
  const taskById = new Map(upcomingTasks.map((t) => [t.id as string, t]));

  // Tracks which (chore, due date) combinations are currently occupied, so
  // we never let a "reschedule" action land a chore on a day where it (or
  // another pending assignment for the same chore) is already scheduled —
  // that would violate the DB's `chore_assignments_chore_due_date_unique`
  // constraint. Seeded from the current state and kept up to date as
  // reschedule actions are applied below, so conflicts introduced earlier
  // in the same batch of actions are also caught.
  const occupiedChoreSlots = new Map<string, string>(); // key: `${chore_id}|${due_date}` -> assignmentId
  for (const t of upcomingTasks) {
    occupiedChoreSlots.set(`${t.chore_id}|${toDateStr(t.due_date)}`, t.id as string);
  }

  // 3. Favourite rooms per user.
  const favoriteRooms = await sql`
    SELECT uf.user_id, r.name AS room_name
    FROM user_favorites uf
    JOIN rooms r ON uf.target_id = r.id
    WHERE uf.target_type = 'room'
      AND r.household_id = ${household.id}
      AND uf.user_id IN (SELECT user_id FROM household_members WHERE household_id = ${household.id})
  `;

  // 4. Historical average rating per user per room (from completed tasks).
  const roomRatings = await sql`
    SELECT
      ca.assigned_user_id AS user_id,
      r.name AS room_name,
      ROUND(AVG(ca.effort_rating)::numeric, 2) AS avg_rating,
      COUNT(*) AS rated_count
    FROM chore_assignments ca
    JOIN chores c ON ca.chore_id = c.id
    LEFT JOIN rooms r ON c.room_id = r.id
    WHERE ca.household_id = ${household.id}
      AND ca.status = 'completed'
      AND ca.effort_rating IS NOT NULL
      AND ca.assigned_user_id IS NOT NULL
    GROUP BY ca.assigned_user_id, r.name
  `;

  // 5. Historical average rating per user per chore.
  const choreRatings = await sql`
    SELECT
      ca.assigned_user_id AS user_id,
      c.title AS chore_title,
      ROUND(AVG(ca.effort_rating)::numeric, 2) AS avg_rating,
      COUNT(*) AS rated_count
    FROM chore_assignments ca
    JOIN chores c ON ca.chore_id = c.id
    WHERE ca.household_id = ${household.id}
      AND ca.status = 'completed'
      AND ca.effort_rating IS NOT NULL
      AND ca.assigned_user_id IS NOT NULL
    GROUP BY ca.assigned_user_id, c.title
  `;

  const payload: HouseholdOptimizationPayload = {
    household: {
      id: household.id,
      name: household.name,
      today,
      weekStart,
      weekEnd,
    },
    users: users.map((u) => ({
      id: u.id as string,
      name: (u.full_name as string) || "Unnamed",
      favoriteRooms: favoriteRooms
        .filter((f) => f.user_id === u.id)
        .map((f) => f.room_name as string),
      roomRatings: roomRatings
        .filter((r) => r.user_id === u.id)
        .map((r) => ({
          room: (r.room_name as string) || null,
          averageRating: Number(r.avg_rating),
          ratedCount: Number(r.rated_count),
        })),
      choreRatings: choreRatings
        .filter((c) => c.user_id === u.id)
        .map((c) => ({
          chore: c.chore_title as string,
          averageRating: Number(c.avg_rating),
          ratedCount: Number(c.rated_count),
        })),
    })),
    upcomingTasks: upcomingTasks.map((t) => ({
      assignmentId: t.id as string,
      chore: t.title as string,
      room: (t.room_name as string) || null,
      dueDate: toDateStr(t.due_date),
      estimatedDurationMinutes: t.estimated_duration_minutes as number | null,
      currentlyAssignedUserId: (t.assigned_user_id as string) || null,
    })),
  };

  let actions: ScheduleAction[];
  try {
    actions = await getScheduleOptimizationActions(payload);
  } catch (error) {
    result.error = (error as Error).message || "Unknown error";
    return result;
  }
  result.actionsProposed = actions.length;

  for (const action of actions) {
    if (!action || typeof action !== "object" || !("assignmentId" in action)) {
      result.skippedActions.push({ action, reason: "Malformed action" });
      continue;
    }

    if (!validAssignmentIds.has(action.assignmentId)) {
      result.skippedActions.push({ action, reason: "Unknown assignmentId (not in this household's upcoming week)" });
      continue;
    }

    const task = taskById.get(action.assignmentId);

    if (action.type === "assign") {
      if (action.userId !== null && !validUserIds.has(action.userId as string)) {
        result.skippedActions.push({ action, reason: "Unknown userId (not a member of this household)" });
        continue;
      }

      if (!dryRun) {
        try {
          await sql`
            UPDATE chore_assignments
            SET assigned_user_id = ${action.userId}
            WHERE id = ${action.assignmentId} AND household_id = ${household.id} AND status = 'pending'
          `;
        } catch (error) {
          result.skippedActions.push({ action, reason: `Database rejected this change: ${(error as Error).message || "unknown error"}` });
          continue;
        }
      }
      result.actionsApplied += 1;
      result.appliedActions.push({
        type: "assign",
        assignmentId: action.assignmentId,
        chore: (task?.title as string) || "Unknown chore",
        room: (task?.room_name as string) || null,
        previousUserId: (task?.assigned_user_id as string) || null,
        newUserId: action.userId,
        reason: action.reason,
      });
    } else if (action.type === "reschedule") {
      if (!isValidDateStr(action.newDueDate) || action.newDueDate < weekStart || action.newDueDate > weekEnd) {
        result.skippedActions.push({ action, reason: "newDueDate missing or outside the optimised week" });
        continue;
      }

      const previousDueDate = toDateStr(task?.due_date);
      const choreId = task?.chore_id as string | undefined;

      // Guard against the AI proposing a move that would put this chore on a
      // day where it (or another pending assignment for the same chore) is
      // already scheduled — this would violate the DB's uniqueness
      // constraint on (chore_id, due_date) if left unchecked.
      if (choreId) {
        const targetSlotKey = `${choreId}|${action.newDueDate}`;
        const occupant = occupiedChoreSlots.get(targetSlotKey);
        if (occupant && occupant !== action.assignmentId) {
          result.skippedActions.push({
            action,
            reason: "Would duplicate this chore: another assignment for the same chore is already due on that date",
          });
          continue;
        }
      }

      if (!dryRun) {
        try {
          await sql`
            UPDATE chore_assignments
            SET due_date = ${action.newDueDate}::date
            WHERE id = ${action.assignmentId} AND household_id = ${household.id} AND status = 'pending'
          `;
        } catch (error) {
          result.skippedActions.push({ action, reason: `Database rejected this change: ${(error as Error).message || "unknown error"}` });
          continue;
        }
      }

      if (choreId) {
        occupiedChoreSlots.delete(`${choreId}|${previousDueDate}`);
        occupiedChoreSlots.set(`${choreId}|${action.newDueDate}`, action.assignmentId);
      }

      result.actionsApplied += 1;
      result.appliedActions.push({
        type: "reschedule",
        assignmentId: action.assignmentId,
        chore: (task?.title as string) || "Unknown chore",
        room: (task?.room_name as string) || null,
        previousDueDate,
        newDueDate: action.newDueDate,
        reason: action.reason,
      });
    } else {
      result.skippedActions.push({ action, reason: "Unknown action type" });
    }
  }

  return result;
}
