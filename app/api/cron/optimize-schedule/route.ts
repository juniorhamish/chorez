import { sql } from "@/lib/db";
import { optimizeHousehold, type HouseholdOptimizationResult } from "@/lib/schedule-optimization";
import { NextResponse } from "next/server";

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

    const results: HouseholdOptimizationResult[] = [];

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
