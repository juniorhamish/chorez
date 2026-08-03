import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();
vi.mock("@/lib/db", () => ({ sql: sqlMock }));

const getScheduleOptimizationActionsMock = vi.fn();
vi.mock("@/lib/gemini", () => ({
  getScheduleOptimizationActions: getScheduleOptimizationActionsMock,
}));

const { optimizeHousehold } = await import("./schedule-optimization");

const HOUSEHOLD = { id: "household-1", name: "Test House", timezone: "UTC" };

const USER = { id: "user-1", full_name: "Alice" };

// "Today" is fixed so the optimised week (today..today+6) is deterministic
// regardless of when this test suite actually runs.
const TODAY = "2026-08-04";

// Two pending assignments for the SAME chore, on different days within the
// upcoming week - the scenario that must never collapse onto a single day.
const TASK_A = {
  id: "assignment-a",
  chore_id: "chore-1",
  assigned_user_id: "user-1",
  due_date: "2026-08-04",
  title: "Vacuum",
  estimated_duration_minutes: 15,
  room_name: "Living Room",
};
const TASK_B = {
  id: "assignment-b",
  chore_id: "chore-1",
  assigned_user_id: "user-1",
  due_date: "2026-08-05",
  title: "Vacuum",
  estimated_duration_minutes: 15,
  room_name: "Living Room",
};

function queueBaseQueries(tasks: unknown[]) {
  sqlMock.mockResolvedValueOnce([USER]); // 1. users
  sqlMock.mockResolvedValueOnce(tasks); // 2. upcomingTasks
  sqlMock.mockResolvedValueOnce([]); // 3. favoriteRooms
  sqlMock.mockResolvedValueOnce([]); // 4. roomRatings
  sqlMock.mockResolvedValueOnce([]); // 5. choreRatings
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  sqlMock.mockReset();
  getScheduleOptimizationActionsMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("optimizeHousehold - duplicate same-day chore guard", () => {
  it("skips a reschedule that would put a chore on a day it's already scheduled on", async () => {
    queueBaseQueries([TASK_A, TASK_B]);
    getScheduleOptimizationActionsMock.mockResolvedValueOnce([
      {
        type: "reschedule",
        assignmentId: "assignment-a",
        newDueDate: "2026-08-05", // same day TASK_B (same chore) is already on
        reason: "Balance workload",
      },
    ]);

    const result = await optimizeHousehold(HOUSEHOLD, true);

    expect(result.actionsApplied).toBe(0);
    expect(result.appliedActions).toHaveLength(0);
    expect(result.skippedActions).toHaveLength(1);
    expect(result.skippedActions[0].reason).toMatch(/duplicate/i);
  });

  it("allows a reschedule onto a day with no conflicting occurrence of the same chore", async () => {
    queueBaseQueries([TASK_A, TASK_B]);
    getScheduleOptimizationActionsMock.mockResolvedValueOnce([
      {
        type: "reschedule",
        assignmentId: "assignment-a",
        newDueDate: "2026-08-06", // a free day for this chore
        reason: "Balance workload",
      },
    ]);

    const result = await optimizeHousehold(HOUSEHOLD, true);

    expect(result.skippedActions).toHaveLength(0);
    expect(result.actionsApplied).toBe(1);
    expect(result.appliedActions[0]).toMatchObject({
      type: "reschedule",
      assignmentId: "assignment-a",
      previousDueDate: "2026-08-04",
      newDueDate: "2026-08-06",
    });
  });

  it("frees up a day once a task moves off it, so a later action can reuse it", async () => {
    queueBaseQueries([TASK_A, TASK_B]);
    getScheduleOptimizationActionsMock.mockResolvedValueOnce([
      // Move A off its day first...
      { type: "reschedule", assignmentId: "assignment-a", newDueDate: "2026-08-06" },
      // ...then B can safely take A's now-vacated day.
      { type: "reschedule", assignmentId: "assignment-b", newDueDate: "2026-08-04" },
    ]);

    const result = await optimizeHousehold(HOUSEHOLD, true);

    expect(result.skippedActions).toHaveLength(0);
    expect(result.actionsApplied).toBe(2);
  });

  it("still blocks a duplicate created purely by two proposed actions in the same batch", async () => {
    queueBaseQueries([TASK_A, TASK_B]);
    getScheduleOptimizationActionsMock.mockResolvedValueOnce([
      // Both proposed actions try to land on the same day for the same chore.
      { type: "reschedule", assignmentId: "assignment-a", newDueDate: "2026-08-06" },
      { type: "reschedule", assignmentId: "assignment-b", newDueDate: "2026-08-06" },
    ]);

    const result = await optimizeHousehold(HOUSEHOLD, true);

    expect(result.actionsApplied).toBe(1);
    expect(result.skippedActions).toHaveLength(1);
    expect(result.skippedActions[0].reason).toMatch(/duplicate/i);
  });

  it("gracefully skips (instead of throwing) when the database rejects the write", async () => {
    queueBaseQueries([TASK_A, TASK_B]);
    getScheduleOptimizationActionsMock.mockResolvedValueOnce([
      { type: "reschedule", assignmentId: "assignment-a", newDueDate: "2026-08-06" },
    ]);
    // Simulate the DB's unique constraint rejecting the UPDATE despite our
    // in-memory check passing (e.g. a concurrent change).
    sqlMock.mockRejectedValueOnce(
      new Error('duplicate key value violates unique constraint "chore_assignments_chore_due_date_unique"')
    );

    const result = await optimizeHousehold(HOUSEHOLD, false);

    expect(result.actionsApplied).toBe(0);
    expect(result.skippedActions).toHaveLength(1);
    expect(result.skippedActions[0].reason).toMatch(/database rejected/i);
  });
});
