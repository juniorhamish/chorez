"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getDbUser } from "./user-actions";
import { optimizeHousehold, type AppliedActionResult, type HouseholdOptimizationResult } from "@/lib/schedule-optimization";

export interface ScheduleOptimizationRun {
  id: string;
  weekStart: string;
  weekEnd: string;
  tasksConsidered: number;
  appliedActions: AppliedActionResult[];
  createdAt: string;
}

async function requireActiveHouseholdAdmin() {
  const dbUser = await getDbUser();
  if (!dbUser?.active_household_id) throw new Error("User or active household not found");

  const membership = (await sql`
    SELECT role FROM household_members
    WHERE user_id = ${dbUser.id} AND household_id = ${dbUser.active_household_id}
  `)[0];

  if (!membership || membership.role !== "admin") {
    throw new Error("Only a household admin can do this");
  }

  return dbUser;
}

// Triggers an on-demand Gemini schedule optimization for the caller's active
// household. Restricted to household admins. Persists the applied actions so
// the change can be summarised and undone later, even after a page refresh.
export async function triggerScheduleOptimization(): Promise<HouseholdOptimizationResult & { runId: string | null }> {
  const dbUser = await requireActiveHouseholdAdmin();

  const household = (await sql`
    SELECT id, name, timezone FROM households WHERE id = ${dbUser.active_household_id}
  `)[0];

  if (!household) throw new Error("Household not found");

  const result = await optimizeHousehold(
    { id: household.id, name: household.name, timezone: household.timezone },
    false
  );

  if (result.error) {
    throw new Error(result.error);
  }

  let runId: string | null = null;
  if (result.actionsApplied > 0) {
    const inserted = (await sql`
      INSERT INTO schedule_optimization_runs (
        household_id, triggered_by_user_id, week_start, week_end, tasks_considered, applied_actions
      )
      VALUES (
        ${household.id}, ${dbUser.id}, ${result.weekStart}::date, ${result.weekEnd}::date,
        ${result.tasksConsidered}, ${JSON.stringify(result.appliedActions)}::jsonb
      )
      RETURNING id
    `)[0];
    runId = inserted.id as string;
  }

  revalidatePath("/dashboard");

  return { ...result, runId };
}

// Returns the most recent not-yet-undone optimization run for the caller's
// active household, so the "Undo" affordance survives a page refresh.
export async function getLatestUndoableOptimizationRun(): Promise<ScheduleOptimizationRun | null> {
  const dbUser = await getDbUser();
  if (!dbUser?.active_household_id) return null;

  const run = (await sql`
    SELECT id, week_start, week_end, tasks_considered, applied_actions, created_at
    FROM schedule_optimization_runs
    WHERE household_id = ${dbUser.active_household_id} AND undone_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `)[0];

  if (!run) return null;

  return {
    id: run.id as string,
    weekStart: run.week_start instanceof Date ? run.week_start.toISOString().split("T")[0] : String(run.week_start),
    weekEnd: run.week_end instanceof Date ? run.week_end.toISOString().split("T")[0] : String(run.week_end),
    tasksConsidered: run.tasks_considered as number,
    appliedActions: run.applied_actions as AppliedActionResult[],
    createdAt: run.created_at instanceof Date ? run.created_at.toISOString() : String(run.created_at),
  };
}

// Reverts every action applied by a given optimization run: restores each
// changed assignment's previous assignee/due date (only if it's still
// pending — if it was completed, deleted, or changed again since, it's left
// alone) and marks the run as undone so it can't be undone twice.
export async function undoScheduleOptimization(runId: string): Promise<void> {
  const dbUser = await requireActiveHouseholdAdmin();

  const run = (await sql`
    SELECT id, applied_actions FROM schedule_optimization_runs
    WHERE id = ${runId} AND household_id = ${dbUser.active_household_id} AND undone_at IS NULL
  `)[0];

  if (!run) throw new Error("Optimization run not found or already undone");

  const appliedActions = run.applied_actions as AppliedActionResult[];

  for (const action of appliedActions) {
    try {
      if (action.type === "assign") {
        await sql`
          UPDATE chore_assignments
          SET assigned_user_id = ${action.previousUserId}
          WHERE id = ${action.assignmentId} AND household_id = ${dbUser.active_household_id} AND status = 'pending'
        `;
      } else if (action.type === "reschedule") {
        // Guarded with a try/catch (rather than a pre-check) because, unlike
        // the initial optimization run, restoring a previous due date could
        // now collide with a chore_assignments_chore_due_date_unique
        // violation if the same chore has since been rescheduled onto that
        // day by other means. If so, skip just this one change rather than
        // failing the whole undo.
        await sql`
          UPDATE chore_assignments
          SET due_date = ${action.previousDueDate}::date
          WHERE id = ${action.assignmentId} AND household_id = ${dbUser.active_household_id} AND status = 'pending'
        `;
      }
    } catch (error) {
      console.error(`Failed to undo ${action.type} action for assignment ${action.assignmentId}:`, error);
    }
  }

  await sql`
    UPDATE schedule_optimization_runs SET undone_at = CURRENT_TIMESTAMP WHERE id = ${runId}
  `;

  revalidatePath("/dashboard");
}
