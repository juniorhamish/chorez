import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();
vi.mock("@/lib/db", () => ({ sql: sqlMock }));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const getDbUserMock = vi.fn();
vi.mock("./user-actions", () => ({ getDbUser: getDbUserMock }));

const { addChore, updateChoreFrequency, getHouseholdTasks, getHouseholdChores } = await import("./chore-actions");
const { getGravatarUrl } = await import("@/lib/gravatar");

const DB_USER = { id: "user-1", active_household_id: "household-1" };

beforeEach(() => {
  sqlMock.mockReset();
  revalidatePathMock.mockReset();
  getDbUserMock.mockReset();
  getDbUserMock.mockResolvedValue(DB_USER);
  // Generic fallback for any sql call not explicitly asserted on in a test,
  // so downstream queries (that this suite doesn't care about) don't crash.
  sqlMock.mockResolvedValue([]);
});

describe("getGravatarUrl", () => {
  it("returns null when there is no email", () => {
    expect(getGravatarUrl(null)).toBeNull();
    expect(getGravatarUrl(undefined)).toBeNull();
  });

  it("returns a gravatar URL keyed by the sha256 hash of the trimmed, lower-cased email", () => {
    const expectedHash = crypto
      .createHash("sha256")
      .update("test@example.com")
      .digest("hex");

    expect(getGravatarUrl("  Test@Example.com  ")).toBe(
      `https://www.gravatar.com/avatar/${expectedHash}?d=identicon`
    );
  });
});

describe("addChore frequency-interval resolution", () => {
  const baseData = {
    title: "Vacuum",
    room_id: "room-1",
    estimated_duration_minutes: 15,
    last_completed_date: "2024-01-01",
  };

  it("resolves frequency_interval to null for frequencies that don't use an interval", async () => {
    sqlMock.mockResolvedValueOnce([{ id: "chore-1" }]); // INSERT INTO chores ... RETURNING id
    await addChore({ ...baseData, frequency: "weekly" });

    // VALUES (household_id, room_id, title, estimated_duration_minutes, frequency, frequency_interval)
    expect(sqlMock.mock.calls[0][6]).toBeNull();
  });

  it("defaults frequency_interval to 1 for every-x-days/every-x-weeks when not provided", async () => {
    sqlMock.mockResolvedValueOnce([{ id: "chore-1" }]);
    await addChore({ ...baseData, frequency: "every-x-weeks" });

    expect(sqlMock.mock.calls[0][6]).toBe(1);
  });

  it("preserves an explicit frequency_interval for every-x-days/every-x-weeks", async () => {
    sqlMock.mockResolvedValueOnce([{ id: "chore-1" }]);
    // A 10-day interval is deliberately >= 7 so this doesn't trip the
    // "more frequent than weekly" rolling-schedule branch, which is
    // exercised separately in lib/scheduling.test.ts.
    await addChore({ ...baseData, frequency: "every-x-days", frequency_interval: 10 });

    expect(sqlMock.mock.calls[0][6]).toBe(10);
  });

  it("revalidates the dashboard path after adding a chore", async () => {
    sqlMock.mockResolvedValueOnce([{ id: "chore-1" }]);
    await addChore({ ...baseData, frequency: "weekly" });

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  it("throws when there is no active household", async () => {
    getDbUserMock.mockResolvedValue({ id: "user-1", active_household_id: null });

    await expect(addChore({ ...baseData, frequency: "weekly" })).rejects.toThrow(
      "User or active household not found"
    );
  });
});

describe("getHouseholdTasks privacy filtering", () => {
  it("derives is_private from whether the chore's private_to_user_id is set", async () => {
    sqlMock.mockResolvedValueOnce([
      { id: "t1", private_to_user_id: null, assigned_user_email: null },
      { id: "t2", private_to_user_id: DB_USER.id, assigned_user_email: null },
    ]);

    const tasks = await getHouseholdTasks();

    expect(tasks[0].is_private).toBe(false);
    expect(tasks[1].is_private).toBe(true);
  });

  it("scopes the query to the active household and the current user (for the privacy check)", async () => {
    sqlMock.mockResolvedValueOnce([]);
    await getHouseholdTasks();

    expect(sqlMock.mock.calls[0]).toContain(DB_USER.active_household_id);
    expect(sqlMock.mock.calls[0]).toContain(DB_USER.id);
  });
});

describe("getHouseholdChores privacy filtering", () => {
  it("derives is_private from whether the chore's private_to_user_id is set", async () => {
    sqlMock.mockResolvedValueOnce([
      { id: "c1", private_to_user_id: null },
      { id: "c2", private_to_user_id: DB_USER.id },
    ]);

    const chores = await getHouseholdChores();

    expect(chores[0].is_private).toBe(false);
    expect(chores[1].is_private).toBe(true);
  });

  it("scopes the query to the active household and the current user (for the privacy check)", async () => {
    sqlMock.mockResolvedValueOnce([]);
    await getHouseholdChores();

    expect(sqlMock.mock.calls[0]).toContain(DB_USER.active_household_id);
    expect(sqlMock.mock.calls[0]).toContain(DB_USER.id);
  });

  it("returns an empty array when there is no active household", async () => {
    getDbUserMock.mockResolvedValue({ id: "user-1", active_household_id: null });

    const chores = await getHouseholdChores();

    expect(chores).toEqual([]);
    expect(sqlMock).not.toHaveBeenCalled();
  });
});

describe("addChore private task handling", () => {
  const baseData = {
    title: "Journal",
    room_id: "room-1",
    estimated_duration_minutes: 15,
    last_completed_date: "2024-01-01",
  };

  it("stores no private_to_user_id and leaves the initial assignment unassigned for a regular (non-private) task", async () => {
    sqlMock.mockResolvedValueOnce([{ id: "chore-1" }]); // INSERT INTO chores ... RETURNING id
    await addChore({ ...baseData, frequency: "weekly" });

    // VALUES (household_id, room_id, title, estimated_duration_minutes, frequency, frequency_interval, private_to_user_id)
    expect(sqlMock.mock.calls[0][7]).toBeNull();
    // VALUES (chore_id, household_id, due_date, status, assigned_user_id)
    expect(sqlMock.mock.calls[1][4]).toBeNull();
  });

  it("stores the creator as private_to_user_id and pre-assigns the initial instance to them when is_private is true", async () => {
    sqlMock.mockResolvedValueOnce([{ id: "chore-1" }]);
    await addChore({ ...baseData, frequency: "weekly", is_private: true });

    expect(sqlMock.mock.calls[0][7]).toBe(DB_USER.id);
    expect(sqlMock.mock.calls[1][4]).toBe(DB_USER.id);
  });
});

describe("addChore due-date clamping", () => {
  const baseData = {
    title: "Vacuum",
    room_id: "room-1",
    estimated_duration_minutes: 15,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules the task immediately for today when last_completed_date is omitted", async () => {
    sqlMock.mockResolvedValueOnce([{ id: "chore-1" }]); // INSERT INTO chores ... RETURNING id
    await addChore({ ...baseData, frequency: "weekly" });

    // VALUES (chore_id, household_id, due_date, status, assigned_user_id)
    expect(sqlMock.mock.calls[1][3]).toBe("2024-06-15");
  });

  it("schedules the task immediately for today when last_completed_date is null or empty string", async () => {
    sqlMock.mockResolvedValueOnce([{ id: "chore-1" }]);
    await addChore({ ...baseData, frequency: "weekly", last_completed_date: null });
    expect(sqlMock.mock.calls[1][3]).toBe("2024-06-15");

    sqlMock.mockReset();
    sqlMock.mockResolvedValueOnce([{ id: "chore-2" }]);
    await addChore({ ...baseData, frequency: "weekly", last_completed_date: "" });
    expect(sqlMock.mock.calls[1][3]).toBe("2024-06-15");
  });

  it("clamps the due date to today when the computed next due date would still be in the past", async () => {
    sqlMock.mockResolvedValueOnce([{ id: "chore-1" }]); // INSERT INTO chores ... RETURNING id
    // last_completed_date is far enough in the past that last + 1 week is
    // still before today (2024-06-15).
    await addChore({ ...baseData, frequency: "weekly", last_completed_date: "2024-01-01" });

    // VALUES (chore_id, household_id, due_date, status)
    expect(sqlMock.mock.calls[1][3]).toBe("2024-06-15");
  });

  it("keeps the computed next due date when it is today or in the future", async () => {
    sqlMock.mockResolvedValueOnce([{ id: "chore-1" }]);
    await addChore({ ...baseData, frequency: "weekly", last_completed_date: "2024-06-14" });

    expect(sqlMock.mock.calls[1][3]).toBe("2024-06-21");
  });
});

describe("updateChoreFrequency frequency-interval resolution", () => {
  it("resolves frequency_interval to null for frequencies that don't use an interval", async () => {
    sqlMock.mockResolvedValueOnce([{ id: "chore-1" }]); // UPDATE chores ... RETURNING id
    await updateChoreFrequency("chore-1", "monthly");

    // SET frequency = ..., frequency_interval = ...
    expect(sqlMock.mock.calls[0][2]).toBeNull();
  });

  it("defaults frequency_interval to 1 for every-x-days/every-x-weeks when not provided", async () => {
    sqlMock.mockResolvedValueOnce([{ id: "chore-1" }]);
    await updateChoreFrequency("chore-1", "every-x-weeks");

    expect(sqlMock.mock.calls[0][2]).toBe(1);
  });

  it("preserves an explicit frequency_interval for every-x-days/every-x-weeks", async () => {
    sqlMock.mockResolvedValueOnce([{ id: "chore-1" }]);
    // Interval >= 7 keeps this on the simple "next instance" branch.
    await updateChoreFrequency("chore-1", "every-x-days", 14);

    expect(sqlMock.mock.calls[0][2]).toBe(14);
  });

  it("throws when the chore doesn't exist in the active household", async () => {
    sqlMock.mockResolvedValueOnce([]); // UPDATE ... RETURNING id -> no matching row

    await expect(updateChoreFrequency("missing-chore", "weekly")).rejects.toThrow(
      "Chore not found"
    );
  });
});
