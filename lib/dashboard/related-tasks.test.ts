import { describe, expect, it } from "vitest";
import {
  getRelatedUpcomingTasks,
  getLastCompletedInstance,
  formatRelativeDueDate,
  RELATED_TASKS_WINDOW_DAYS,
} from "./related-tasks";
import type { Task } from "@/lib/dashboard/types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    chore_id: "chore-1",
    assigned_user_id: "user-1",
    due_date: "2024-06-10",
    status: "pending",
    title: "Vacuum living room",
    estimated_duration_minutes: 20,
    frequency: "weekly",
    frequency_interval: null,
    room_name: "Living Room",
    room_id: "room-1",
    assigned_user_name: "Alex",
    assigned_user_avatar: "A",
    assigned_user_avatar_url: null,
    assigned_user_color: "bg-indigo-100 text-indigo-700",
    completed_at: null,
    actual_duration_minutes: null,
    effort_rating: null,
    notes: null,
    private_to_user_id: null,
    is_private: false,
    ...overrides,
  };
}

describe("getRelatedUpcomingTasks", () => {
  it("suggests a pending task in the same room due within the window", () => {
    const task = makeTask({ id: "task-1", room_id: "room-1", due_date: "2024-06-10" });
    const related = makeTask({
      id: "task-2",
      chore_id: "chore-2",
      room_id: "room-1",
      due_date: "2024-06-12",
      title: "Dust shelves",
    });

    const result = getRelatedUpcomingTasks(task, [task, related]);

    expect(result).toEqual([related]);
  });

  it("excludes tasks from a different room", () => {
    const task = makeTask({ id: "task-1", room_id: "room-1", due_date: "2024-06-10" });
    const otherRoom = makeTask({
      id: "task-2",
      chore_id: "chore-2",
      room_id: "room-2",
      due_date: "2024-06-11",
    });

    expect(getRelatedUpcomingTasks(task, [task, otherRoom])).toEqual([]);
  });

  it("excludes completed tasks", () => {
    const task = makeTask({ id: "task-1", room_id: "room-1", due_date: "2024-06-10" });
    const completed = makeTask({
      id: "task-2",
      chore_id: "chore-2",
      room_id: "room-1",
      due_date: "2024-06-11",
      status: "completed",
    });

    expect(getRelatedUpcomingTasks(task, [task, completed])).toEqual([]);
  });

  it("excludes other instances of the same chore (not a 'different' task)", () => {
    const task = makeTask({ id: "task-1", chore_id: "chore-1", room_id: "room-1", due_date: "2024-06-10" });
    const nextOccurrence = makeTask({
      id: "task-2",
      chore_id: "chore-1",
      room_id: "room-1",
      due_date: "2024-06-11",
    });

    expect(getRelatedUpcomingTasks(task, [task, nextOccurrence])).toEqual([]);
  });

  it("excludes tasks due on the same day (already shown as their own card) and outside the window", () => {
    const task = makeTask({ id: "task-1", room_id: "room-1", due_date: "2024-06-10" });
    const sameDay = makeTask({ id: "task-2", chore_id: "chore-2", room_id: "room-1", due_date: "2024-06-10" });
    const tooFar = makeTask({
      id: "task-3",
      chore_id: "chore-3",
      room_id: "room-1",
      due_date: `2024-06-${10 + RELATED_TASKS_WINDOW_DAYS + 1}`,
    });

    expect(getRelatedUpcomingTasks(task, [task, sameDay, tooFar])).toEqual([]);
  });

  it("dedupes by chore_id, keeping only the soonest instance of a repeating chore", () => {
    const task = makeTask({ id: "task-1", room_id: "room-1", due_date: "2024-06-10" });
    const soonInstance = makeTask({
      id: "task-2",
      chore_id: "chore-daily",
      room_id: "room-1",
      due_date: "2024-06-11",
      title: "Wipe counters",
    });
    const laterInstance = makeTask({
      id: "task-3",
      chore_id: "chore-daily",
      room_id: "room-1",
      due_date: "2024-06-12",
      title: "Wipe counters",
    });

    const result = getRelatedUpcomingTasks(task, [task, laterInstance, soonInstance]);

    expect(result).toEqual([soonInstance]);
  });

  it("sorts results by due date ascending", () => {
    const task = makeTask({ id: "task-1", room_id: "room-1", due_date: "2024-06-10" });
    const later = makeTask({ id: "task-2", chore_id: "chore-2", room_id: "room-1", due_date: "2024-06-12" });
    const sooner = makeTask({ id: "task-3", chore_id: "chore-3", room_id: "room-1", due_date: "2024-06-11" });

    expect(getRelatedUpcomingTasks(task, [task, later, sooner])).toEqual([sooner, later]);
  });

  it("excludes chore_ids passed in excludeChoreIds, to avoid repeating a suggestion under multiple cards", () => {
    const task = makeTask({ id: "task-1", room_id: "room-1", due_date: "2024-06-10" });
    const related = makeTask({ id: "task-2", chore_id: "chore-2", room_id: "room-1", due_date: "2024-06-11" });

    const result = getRelatedUpcomingTasks(task, [task, related], {
      excludeChoreIds: new Set(["chore-2"]),
    });

    expect(result).toEqual([]);
  });

  it("returns an empty array when the task has no room", () => {
    const task = makeTask({ id: "task-1", room_id: null, due_date: "2024-06-10" });
    const related = makeTask({ id: "task-2", chore_id: "chore-2", room_id: null, due_date: "2024-06-11" });

    expect(getRelatedUpcomingTasks(task, [task, related])).toEqual([]);
  });
});

describe("getLastCompletedInstance", () => {
  it("returns null when the chore has never been completed", () => {
    const pending = makeTask({ chore_id: "chore-1", status: "pending" });
    expect(getLastCompletedInstance("chore-1", [pending])).toBeNull();
  });

  it("returns the most recently completed instance of the chore", () => {
    const older = makeTask({
      id: "task-old",
      chore_id: "chore-1",
      status: "completed",
      completed_at: "2024-06-01T10:00:00Z",
      notes: "old notes",
    });
    const newer = makeTask({
      id: "task-new",
      chore_id: "chore-1",
      status: "completed",
      completed_at: "2024-06-05T10:00:00Z",
      notes: "newest notes",
    });

    expect(getLastCompletedInstance("chore-1", [older, newer])).toEqual(newer);
  });

  it("ignores completed instances of other chores", () => {
    const otherChore = makeTask({ chore_id: "chore-2", status: "completed", completed_at: "2024-06-01T10:00:00Z" });
    expect(getLastCompletedInstance("chore-1", [otherChore])).toBeNull();
  });
});

describe("formatRelativeDueDate", () => {
  const today = new Date("2024-06-10");

  it("labels today's date as 'Today'", () => {
    expect(formatRelativeDueDate("2024-06-10", today)).toBe("Today");
  });

  it("labels tomorrow as 'Tomorrow'", () => {
    expect(formatRelativeDueDate("2024-06-11", today)).toBe("Tomorrow");
  });

  it("labels dates further out with a day count", () => {
    expect(formatRelativeDueDate("2024-06-13", today)).toBe("In 3 days");
  });

  it("labels past dates as days ago", () => {
    expect(formatRelativeDueDate("2024-06-08", today)).toBe("2 days ago");
  });
});
