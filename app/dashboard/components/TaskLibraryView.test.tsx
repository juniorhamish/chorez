import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TaskLibraryView from "./TaskLibraryView";
import type { Chore, Room } from "@/lib/dashboard/types";

const ROOMS: Room[] = [
  { id: "all", name: "All", icon_name: null },
  { id: "room-1", name: "Kitchen", icon_name: "UtensilsCrossed" },
  { id: "room-2", name: "Bathroom", icon_name: "Bath" },
];

function makeChore(overrides: Partial<Chore> = {}): Chore {
  return {
    id: "chore-1",
    title: "Wash dishes",
    room_id: "room-1",
    room_name: "Kitchen",
    room_icon_name: "UtensilsCrossed",
    estimated_duration_minutes: 15,
    frequency: "daily",
    frequency_interval: null,
    private_to_user_id: null,
    is_private: false,
    next_due_date: "2024-06-20",
    ...overrides,
  };
}

function baseProps(overrides: Partial<Parameters<typeof TaskLibraryView>[0]> = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    chores: [
      makeChore({ id: "chore-1", title: "Wash dishes", room_id: "room-1", room_name: "Kitchen" }),
      makeChore({ id: "chore-2", title: "Clean tub", room_id: "room-2", room_name: "Bathroom" }),
    ],
    rooms: ROOMS,
    selectedRoom: "all",
    setSelectedRoom: vi.fn(),
    onEditFrequency: vi.fn(),
    onEditRoom: vi.fn(),
    onDeleteChore: vi.fn(),
    onAddTask: vi.fn(),
    ...overrides,
  };
}

describe("TaskLibraryView", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<TaskLibraryView {...baseProps({ isOpen: false })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows every chore when 'All' is selected", () => {
    render(<TaskLibraryView {...baseProps()} />);

    expect(screen.getByText("Wash dishes")).toBeInTheDocument();
    expect(screen.getByText("Clean tub")).toBeInTheDocument();
  });

  it("filters by room: clicking a room chip narrows the list to that room's chores", async () => {
    const user = userEvent.setup();
    const setSelectedRoom = vi.fn();
    render(<TaskLibraryView {...baseProps({ setSelectedRoom })} />);

    await user.click(screen.getByRole("button", { name: "Kitchen" }));

    expect(setSelectedRoom).toHaveBeenCalledWith("room-1");
  });

  it("only shows chores for the selected room", () => {
    render(<TaskLibraryView {...baseProps({ selectedRoom: "room-1" })} />);

    expect(screen.getByText("Wash dishes")).toBeInTheDocument();
    expect(screen.queryByText("Clean tub")).not.toBeInTheDocument();
  });

  it("shows a generic 'Add Task' shortcut when 'All' is selected", async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn();
    render(<TaskLibraryView {...baseProps({ selectedRoom: "all", onAddTask })} />);

    await user.click(screen.getByRole("button", { name: "Add Task" }));

    expect(onAddTask).toHaveBeenCalledWith();
  });

  it("shows a room-specific 'Add Task to {Room}' shortcut that fires with the selected room id", async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn();
    render(<TaskLibraryView {...baseProps({ selectedRoom: "room-1", onAddTask })} />);

    await user.click(screen.getByRole("button", { name: "Add Task to Kitchen" }));

    expect(onAddTask).toHaveBeenCalledWith("room-1");
  });

  it("shows an empty state when the filtered room has no chores", () => {
    render(<TaskLibraryView {...baseProps({ selectedRoom: "room-2", chores: [] })} />);

    expect(screen.getByText(/No chores yet in Bathroom/i)).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TaskLibraryView {...baseProps({ onClose })} />);

    await user.click(screen.getByRole("button", { name: /close task library/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
