import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AddTaskModal from "./AddTaskModal";
import type { Room } from "@/lib/dashboard/types";

const mockRooms: Room[] = [
  { id: "room-1", name: "Kitchen", icon_name: "UtensilsCrossed" },
  { id: "room-2", name: "Bathroom", icon_name: "Bath" },
];

describe("AddTaskModal", () => {
  const defaultProps = {
    selectableRooms: mockRooms,
    newTaskTitle: "Mop floors",
    setNewTaskTitle: vi.fn(),
    newTaskRoomId: "room-1",
    setNewTaskRoomId: vi.fn(),
    newTaskDuration: "15",
    setNewTaskDuration: vi.fn(),
    newTaskFrequency: "weekly" as const,
    setNewTaskFrequency: vi.fn(),
    newTaskFrequencyInterval: "1",
    setNewTaskFrequencyInterval: vi.fn(),
    newTaskHasLastCompleted: false,
    setNewTaskHasLastCompleted: vi.fn(),
    newTaskLastCompleted: "",
    setNewTaskLastCompleted: vi.fn(),
    newTaskIsPrivate: false,
    setNewTaskIsPrivate: vi.fn(),
    isCustomIntervalFrequency: false,
    isAddTaskValid: true,
    isAddingTask: false,
    onClose: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onOpenAddRoom: vi.fn(),
  };

  it("does not display date last completed input when newTaskHasLastCompleted is false (default)", () => {
    render(<AddTaskModal {...defaultProps} />);

    const checkbox = screen.getByRole("checkbox", { name: /set date last completed/i });
    expect(checkbox).not.toBeChecked();
    expect(screen.queryByLabelText("Date Last Completed")).not.toBeInTheDocument();
  });

  it("displays date last completed input when newTaskHasLastCompleted is true", () => {
    render(
      <AddTaskModal
        {...defaultProps}
        newTaskHasLastCompleted={true}
        newTaskLastCompleted="2024-06-10"
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /set date last completed/i });
    expect(checkbox).toBeChecked();
    expect(screen.getByLabelText("Date Last Completed")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2024-06-10")).toBeInTheDocument();
  });

  it("calls setNewTaskHasLastCompleted and seeds today's date when checking the checkbox", async () => {
    const user = userEvent.setup();
    const setNewTaskHasLastCompleted = vi.fn();
    const setNewTaskLastCompleted = vi.fn();

    render(
      <AddTaskModal
        {...defaultProps}
        setNewTaskHasLastCompleted={setNewTaskHasLastCompleted}
        setNewTaskLastCompleted={setNewTaskLastCompleted}
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /set date last completed/i });
    await user.click(checkbox);

    expect(setNewTaskHasLastCompleted).toHaveBeenCalledWith(true);
    expect(setNewTaskLastCompleted).toHaveBeenCalledWith(new Date().toLocaleDateString("en-CA"));
  });

  it("calls onSubmit when Add Task button is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AddTaskModal {...defaultProps} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Add Task" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
