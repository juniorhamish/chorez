import { sql } from "@/lib/db";
import { ensureUpcomingInstancesForHousehold } from "@/lib/scheduling";
import { NextResponse } from "next/server";

async function handleReschedule(req: Request) {
  // Simple auth check for the cron job (matching push notification cron endpoint)
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");

    const households = await sql`SELECT id, timezone FROM households`;
    
    let totalRescheduled = 0;
    let totalCreated = 0;
    const allRescheduledTasks = [];

    for (const household of households) {
      const tz = household.timezone || "Europe/London";
      let currentDateStr: string;

      if (dateParam) {
        currentDateStr = dateParam;
      } else {
        // Today in household's timezone
        const now = new Date();
        currentDateStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(now);
      }

      // Some overdue assignments can't simply move to today because a
      // (chore_id, due_date) unique constraint would then have two rows for
      // the same chore on today's date - either because a fresh instance
      // was already created for today, or because more than one overdue
      // instance of the same chore is pending. Rank the candidates per
      // chore (preferring a row that's already due today, otherwise the
      // most recently completed/created one) and drop the rest so the
      // reschedule below never collides with the unique constraint.
      await sql`
        WITH ranked AS (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY chore_id
              ORDER BY
                (due_date = ${currentDateStr}::date) DESC,
                (status = 'completed') DESC,
                due_date DESC
            ) AS row_number
          FROM chore_assignments
          WHERE household_id = ${household.id}
            AND due_date <= ${currentDateStr}::date
            AND (due_date = ${currentDateStr}::date OR status != 'completed')
        )
        DELETE FROM chore_assignments
        WHERE household_id = ${household.id}
          AND due_date < ${currentDateStr}::date
          AND status != 'completed'
          AND id IN (SELECT id FROM ranked WHERE row_number > 1)
      `;

      // Look at all remaining tasks in the past for this household that are
      // incomplete, and reschedule all of those tasks to the current day.
      const updatedAssignments = await sql`
        UPDATE chore_assignments
        SET due_date = ${currentDateStr}::date
        WHERE household_id = ${household.id}
          AND due_date < ${currentDateStr}::date
          AND status != 'completed'
        RETURNING id, chore_id, household_id, assigned_user_id, due_date, status
      `;

      totalRescheduled += updatedAssignments.length;
      allRescheduledTasks.push(...updatedAssignments);

      // Top up the rolling schedule: chores that recur more frequently than
      // weekly (e.g. daily) should always have a pending instance for every
      // occurrence between today and the end of the schedule horizon, so
      // the optimiser can assign a different person to each day. Without
      // this, a household that isn't actively completing tasks would never
      // get new days added to its schedule.
      totalCreated += await ensureUpcomingInstancesForHousehold(household.id);
    }

    return NextResponse.json({
      success: true,
      rescheduledCount: totalRescheduled,
      rescheduledTasks: allRescheduledTasks,
      createdInstancesCount: totalCreated
    });
  } catch (error) {
    console.error("Failed to reschedule incomplete tasks:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleReschedule(req);
}

export async function POST(req: Request) {
  return handleReschedule(req);
}
