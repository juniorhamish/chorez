import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RoomFilterBar from "./RoomFilterBar";
import type { Room } from "@/lib/dashboard/types";

const ROOMS: Room[] = [
  { id: "all", name: "All", icon_name: null },
  { id: "room-1", name: "Kitchen", icon_name: "UtensilsCrossed" },
  { id: "room-2", name: "Bathroom", icon_name: "Bath" },
];

function baseProps(overrides: Partial<Parameters<typeof RoomFilterBar>[0]> = {}) {
  return {
    rooms: ROOMS,
    selectedRoom: "all",
    setSelectedRoom: vi.fn(),
    favoriteRooms: [],
    toggleFavoriteRoom: vi.fn(),
    openAddRoom: vi.fn(),
    ...overrides,
  };
}

describe("RoomFilterBar", () => {
  it("filters by room: clicking a room chip selects it", async () => {
    const user = userEvent.setup();
    const setSelectedRoom = vi.fn();
    render(<RoomFilterBar {...baseProps({ setSelectedRoom })} />);

    await user.click(screen.getByText("Kitchen"));

    expect(setSelectedRoom).toHaveBeenCalledWith("room-1");
  });

  it("toggling a favorite room calls toggleFavoriteRoom with the room id", async () => {
    const user = userEvent.setup();
    const toggleFavoriteRoom = vi.fn();
    render(<RoomFilterBar {...baseProps({ toggleFavoriteRoom })} />);

    // Kitchen's favorite star is the lucide "star" icon rendered after its name.
    const kitchenChip = screen.getByText("Kitchen").closest("button")!;
    const star = kitchenChip.querySelector("svg.lucide-star")!;
    await user.click(star);

    expect(toggleFavoriteRoom).toHaveBeenCalledWith("room-1", expect.anything());
  });

  it("reflects favorited rooms with a filled star", () => {
    render(<RoomFilterBar {...baseProps({ favoriteRooms: ["room-1"] })} />);

    const kitchenChip = screen.getByText("Kitchen").closest("button")!;
    const star = kitchenChip.querySelector("svg.fill-amber-400");
    expect(star).not.toBeNull();

    const bathroomChip = screen.getByText("Bathroom").closest("button")!;
    const unfavoritedStar = bathroomChip.querySelector("svg.fill-amber-400");
    expect(unfavoritedStar).toBeNull();
  });

  it("does not render a favorite star for the 'All' room", () => {
    render(<RoomFilterBar {...baseProps()} />);

    const allChip = screen.getByText("All").closest("button")!;
    // Icon (room icon) + label only, no star toggle for "All".
    expect(allChip.querySelectorAll("svg")).toHaveLength(1);
  });

  it("opens the add-room form when 'Add Room' is clicked", async () => {
    const user = userEvent.setup();
    const openAddRoom = vi.fn();
    render(<RoomFilterBar {...baseProps({ openAddRoom })} />);

    await user.click(screen.getByRole("button", { name: "Add Room" }));

    expect(openAddRoom).toHaveBeenCalledWith(false);
  });
});
