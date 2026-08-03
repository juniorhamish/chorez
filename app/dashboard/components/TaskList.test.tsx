import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TaskList from "./TaskList";
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
    ...overrides,
  };
}

function baseProps(overrides: Partial<Parameters<typeof TaskList>[0]> = {}) {
  return {
    viewMode: 'mine' as const,
    filteredTasks: [],
    selectedDay: new Date("2024-06-10"),
    isRefreshing: false,
    handleRefresh: vi.fn().mockResolvedValue(undefined),
    favoriteTasks: [],
    toggleFavoriteTask: vi.fn(),
    openEditFrequency: vi.fn(),
    openEditRoom: vi.fn(),
    onDeleteChore: vi.fn(),
    stopwatch: null,
    stopwatchDisplayMs: 0,
    isStopwatchCapped: false,
    startStopwatch: vi.fn(),
    handleStopStopwatch: vi.fn(),
    handleAssignToSelf: vi.fn().mockResolvedValue(undefined),
    isAssigningTask: null,
    handleFinishTask: vi.fn(),
    ...overrides,
  };
}

describe("TaskList", () => {
  it("only renders the tasks it is given (reflects filtering done by the caller)", () => {
    const visibleTask = makeTask({ id: "task-1", title: "Vacuum living room" });
    render(<TaskList {...baseProps({ filteredTasks: [visibleTask] })} />);

    expect(screen.getByText("Vacuum living room")).toBeInTheDocument();
    expect(screen.queryByText("Do the dishes")).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no tasks for the current selection", () => {
    render(<TaskList {...baseProps({ filteredTasks: [] })} />);

    expect(screen.getByText("No tasks found for this selection")).toBeInTheDocument();
  });

  it("shows the 'My Tasks' vs 'Household Tasks' heading based on viewMode", () => {
    const { rerender } = render(<TaskList {...baseProps({ viewMode: 'mine' })} />);
    expect(screen.getByText("My Tasks")).toBeInTheDocument();

    rerender(<TaskList {...baseProps({ viewMode: 'household' })} />);
    expect(screen.getByText("Household Tasks")).toBeInTheDocument();
  });

  it("completing a task calls handleFinishTask with the task", async () => {
    const user = userEvent.setup();
    const handleFinishTask = vi.fn();
    const task = makeTask();
    render(<TaskList {...baseProps({ filteredTasks: [task], handleFinishTask })} />);

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(handleFinishTask).toHaveBeenCalledWith(task);
  });

  it("toggling a task's favorite star calls toggleFavoriteTask with its chore_id", async () => {
    const user = userEvent.setup();
    const toggleFavoriteTask = vi.fn();
    const task = makeTask({ chore_id: "chore-42" });
    const { container } = render(<TaskList {...baseProps({ filteredTasks: [task], toggleFavoriteTask })} />);

    const starButton = container.querySelector("svg.lucide-star")!.closest("button")!;
    await user.click(starButton);

    expect(toggleFavoriteTask).toHaveBeenCalledWith("chore-42");
  });
});
