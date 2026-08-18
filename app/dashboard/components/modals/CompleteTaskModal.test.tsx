
import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CompleteTaskModal from "./CompleteTaskModal";
import type { Task } from "@/lib/dashboard/types";

const mockTask: Task = {
  id: "task-1",
  chore_id: "chore-1",
  assigned_user_id: "user-1",
  due_date: new Date().toISOString(),
  status: "pending",
  title: "Test Task",
  estimated_duration_minutes: 20,
  frequency: "daily",
  frequency_interval: 1,
  room_name: "Kitchen",
  room_id: "room-1",
  assigned_user_name: "Test User",
  assigned_user_avatar: null,
  assigned_user_avatar_url: null,
  assigned_user_color: "blue",
  completed_at: null,
  actual_duration_minutes: null,
  effort_rating: null,
  notes: null,
  private_to_user_id: null,
  is_private: false,
};

describe("CompleteTaskModal", () => {
  const defaultProps = {
    task: mockTask,
    actualMinutes: "",
    setActualMinutes: vi.fn(),
    wasStopwatchCapped: false,
    rating: 0,
    setRating: vi.fn(),
    completionNotes: "",
    setCompletionNotes: vi.fn(),
    isCompletingTask: false,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  it("renders the MessageSquare icon with peer-focus:opacity-0 when notes are empty", () => {
    const { container } = render(<CompleteTaskModal {...defaultProps} />);
    const icon = container.querySelector("svg.text-indigo-200");
    expect(icon).toBeInTheDocument();
    const className = icon?.getAttribute("class") || "";
    expect(className).toContain("peer-focus:opacity-0");
    // Should NOT have the plain opacity-0 class (which is used when content is present)
    // We check that it doesn't match opacity-0 when it's not preceded by a colon
    expect(className).not.toMatch(/(^|\s)opacity-0(\s|$)/);
  });

  it("should have the plain opacity-0 class when notes are not empty", () => {
    const { container } = render(
      <CompleteTaskModal {...defaultProps} completionNotes="Some notes" />
    );
    const icon = container.querySelector("svg.text-indigo-200");
    expect(icon?.getAttribute("class")).toMatch(/(^|\s)opacity-0(\s|$)/);
  });
});
