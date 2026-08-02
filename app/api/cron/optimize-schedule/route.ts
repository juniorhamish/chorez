import { sql } from "@/lib/db";
import { getScheduleOptimizationActions, type HouseholdOptimizationPayload, type ScheduleAction } from "@/lib/gemini";
import { NextResponse } from "next/server";

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

function isValidDateStr(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

type AppliedActionResult =
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

interface HouseholdResult {
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

async function optimizeHousehold(
  household: { id: string; name: string; timezone: string | null },
  dryRun: boolean
): Promise<HouseholdResult> {
  const tz = household.timezone || "Europe/London";
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const weekStart = today;
  const weekEnd = addDays(today, 6);

  const result: HouseholdResult = {
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

  // 2. Upcoming week's pending tasks for this household.
  const upcomingTasks = await sql`
    SELECT
      ca.id,
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
    ORDER BY ca.due_date ASC
  `;

  result.tasksConsidered = upcomingTasks.length;

  if (upcomingTasks.length === 0) {
    return result;
  }
  const validAssignmentIds = new Set(upcomingTasks.map((t) => t.id as string));
  const taskById = new Map(upcomingTasks.map((t) => [t.id as string, t]));

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
      dueDate: (t.due_date instanceof Date ? t.due_date.toISOString().split("T")[0] : String(t.due_date)),
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
        await sql`
          UPDATE chore_assignments
          SET assigned_user_id = ${action.userId}
          WHERE id = ${action.assignmentId} AND household_id = ${household.id} AND status = 'pending'
        `;
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

      if (!dryRun) {
        await sql`
          UPDATE chore_assignments
          SET due_date = ${action.newDueDate}::date
          WHERE id = ${action.assignmentId} AND household_id = ${household.id} AND status = 'pending'
        `;
      }
      result.actionsApplied += 1;
      const previousDueDate = task?.due_date instanceof Date
        ? task.due_date.toISOString().split("T")[0]
        : String(task?.due_date ?? "");
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

async function handleOptimizeSchedule(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const householdIdParam = url.searchParams.get("householdId");
    const dryRun = url.searchParams.get("dryRun") === "true";

    const households = householdIdParam
      ? await sql`SELECT id, name, timezone FROM households WHERE id = ${householdIdParam}`
      : await sql`SELECT id, name, timezone FROM households`;

    const results: HouseholdResult[] = [];

    // Households are optimised one at a time, with a separate Gemini request
    // per household, so that context/instructions/results never mix across
    // households and each request stays small (only that household's data).
    for (const household of households) {
      try {
        const result = await optimizeHousehold(
          { id: household.id, name: household.name, timezone: household.timezone },
          dryRun
        );
        results.push(result);
      } catch (error) {
        results.push({
          householdId: household.id,
          householdName: household.name,
          weekStart: "",
          weekEnd: "",
          tasksConsidered: 0,
          actionsProposed: 0,
          actionsApplied: 0,
          appliedActions: [],
          skippedActions: [],
          error: (error as Error).message || "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      householdsProcessed: results.length,
      results,
    });
  } catch (error) {
    console.error("Failed to optimize schedule:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleOptimizeSchedule(req);
}

export async function POST(req: Request) {
  return handleOptimizeSchedule(req);
}
