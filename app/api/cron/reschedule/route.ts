import { sql } from "@/lib/db";
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

      // Look at all tasks in the past for this household that are incomplete,
      // and reschedule all of those tasks to the current day.
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
    }

    return NextResponse.json({
      success: true,
      rescheduledCount: totalRescheduled,
      rescheduledTasks: allRescheduledTasks
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
