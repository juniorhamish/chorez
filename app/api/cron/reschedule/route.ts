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

    let currentDateStr: string;
    if (dateParam) {
      currentDateStr = dateParam;
    } else {
      // Default to today
      const now = new Date();
      currentDateStr = now.toISOString().split('T')[0];
    }

    // Look at all tasks in the past that are incomplete,
    // and reschedule all of those tasks to the current day.
    const updatedAssignments = await sql`
      UPDATE chore_assignments
      SET due_date = ${currentDateStr}::date
      WHERE due_date < ${currentDateStr}::date
        AND status != 'completed'
      RETURNING id, chore_id, household_id, assigned_user_id, due_date, status
    `;

    return NextResponse.json({
      success: true,
      currentDate: currentDateStr,
      targetDate: currentDateStr,
      rescheduledCount: updatedAssignments.length,
      rescheduledTasks: updatedAssignments
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
