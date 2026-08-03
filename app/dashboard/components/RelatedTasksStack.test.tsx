import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RelatedTasksStack from "./RelatedTasksStack";
import type { Task } from "@/lib/dashboard/types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    chore_id: "chore-1",
    assigned_user_id: "user-1",
    due_date: "2024-06-11",
    status: "pending",
    title: "Dust shelves",
    estimated_duration_minutes: 10,
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

describe("RelatedTasksStack", () => {
  it("renders nothing when there are no related tasks", () => {
    const { container } = render(
      <RelatedTasksStack relatedTasks={[]} allTasks={[]} onJumpToDay={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a collapsed, clearly-optional suggestion summary", () => {
    const related = makeTask();
    render(<RelatedTasksStack relatedTasks={[related]} allTasks={[related]} onJumpToDay={vi.fn()} />);

    expect(screen.getByText(/1 more task needed soon in this room/i)).toBeInTheDocument();
    expect(screen.getByText("Suggested")).toBeInTheDocument();
    // Not shown until expanded.
    expect(screen.queryByText("Dust shelves")).not.toBeInTheDocument();
  });

  it("expands to list each suggested task", async () => {
    const user = userEvent.setup();
    const related = makeTask({ title: "Dust shelves" });
    render(<RelatedTasksStack relatedTasks={[related]} allTasks={[related]} onJumpToDay={vi.fn()} />);

    await user.click(screen.getByText(/more task needed soon in this room/i));

    expect(screen.getByText("Dust shelves")).toBeInTheDocument();
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });

  it("opening a suggested task shows notes from the last time it was completed", async () => {
    const user = userEvent.setup();
    const related = makeTask({ chore_id: "chore-2", title: "Dust shelves" });
    const previousCompletion = makeTask({
      id: "task-old",
      chore_id: "chore-2",
      status: "completed",
      completed_at: "2024-06-01T10:00:00Z",
      actual_duration_minutes: 8,
      notes: "Used the microfiber cloth",
    });

    render(
      <RelatedTasksStack
        relatedTasks={[related]}
        allTasks={[related, previousCompletion]}
        onJumpToDay={vi.fn()}
      />
    );

    await user.click(screen.getByText(/more task needed soon in this room/i));
    await user.click(screen.getByText("Dust shelves"));

    expect(screen.getByText("Used the microfiber cloth")).toBeInTheDocument();
    expect(screen.getByText(/Took 8m/)).toBeInTheDocument();
  });

  it("shows a fallback message when a suggested task has no history", async () => {
    const user = userEvent.setup();
    const related = makeTask({ chore_id: "chore-new", title: "Water the plants" });

    render(<RelatedTasksStack relatedTasks={[related]} allTasks={[related]} onJumpToDay={vi.fn()} />);

    await user.click(screen.getByText(/more task needed soon in this room/i));
    await user.click(screen.getByText("Water the plants"));

    expect(screen.getByText(/No history yet for this task/i)).toBeInTheDocument();
  });

  it("calls onJumpToDay with the suggested task's due date", async () => {
    const user = userEvent.setup();
    const onJumpToDay = vi.fn();
    const related = makeTask({ title: "Dust shelves", due_date: "2024-06-15" });

    render(<RelatedTasksStack relatedTasks={[related]} allTasks={[related]} onJumpToDay={onJumpToDay} />);

    await user.click(screen.getByText(/more task needed soon in this room/i));
    await user.click(screen.getByText("Dust shelves"));
    await user.click(screen.getByText("View that day"));

    expect(onJumpToDay).toHaveBeenCalledTimes(1);
    const calledWith = onJumpToDay.mock.calls[0][0] as Date;
    expect(calledWith.getFullYear()).toBe(2024);
  });
});
