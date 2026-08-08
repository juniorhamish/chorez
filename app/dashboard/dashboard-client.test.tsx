import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DbUser, Household, HouseholdMember, HouseholdUser, Room, Task } from "@/lib/dashboard/types";

// This suite exercises the full `DashboardClient` composition root (header,
// week strip, room filter bar, task list and the complete-task modal wired
// together) rather than a single extracted component, because the actual
// day/room/view-mode filtering logic lives in `DashboardClient` itself.
// All server actions and the auth0/navigation hooks are mocked so no real
// network/DB access happens.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@auth0/nextjs-auth0/client", () => ({
  useUser: () => ({ user: { name: "Alex", given_name: "Alex" } }),
}));

const completeTaskMock = vi.fn().mockResolvedValue(undefined);
const toggleFavoriteRoomMock = vi.fn().mockResolvedValue(undefined);
const toggleFavoriteChoreMock = vi.fn().mockResolvedValue(undefined);
const removeMemberMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/actions/chore-actions", () => ({
  addChore: vi.fn().mockResolvedValue({ id: "chore-new" }),
  addRoom: vi.fn().mockResolvedValue({ id: "room-new" }),
  completeTask: completeTaskMock,
  assignTaskToSelf: vi.fn().mockResolvedValue(undefined),
  deleteChore: vi.fn().mockResolvedValue(undefined),
  deleteTaskInstance: vi.fn().mockResolvedValue(undefined),
  updateChoreFrequency: vi.fn().mockResolvedValue(undefined),
  updateChoreRoom: vi.fn().mockResolvedValue(undefined),
  toggleFavoriteRoom: toggleFavoriteRoomMock,
  toggleFavoriteChore: toggleFavoriteChoreMock,
}));

vi.mock("@/lib/actions/user-actions", () => ({
  updateUserName: vi.fn().mockResolvedValue(undefined),
  updateNotificationSchedule: vi.fn().mockResolvedValue(undefined),
  inviteUser: vi.fn().mockResolvedValue(undefined),
  respondToInvitation: vi.fn().mockResolvedValue(undefined),
  switchHousehold: vi.fn().mockResolvedValue(undefined),
  removeMember: removeMemberMock,
}));

const { default: DashboardClient } = await import("./dashboard-client");

const DB_USER: DbUser = {
  id: "user-1",
  full_name: "Alex",
  active_household_id: "household-1",
  morning_notification_hour: 8,
  evening_notification_hour: 18,
};

const ROOMS: Room[] = [
  { id: "room-1", name: "Kitchen", icon_name: "UtensilsCrossed" },
  { id: "room-2", name: "Bathroom", icon_name: "Bath" },
];

const USERS: HouseholdUser[] = [
  { id: "user-1", name: "Alex", avatar: "A", color: null },
];

const ADMIN_HOUSEHOLDS: Household[] = [
  { id: "household-1", name: "Our Home", role: "admin" },
];

const MEMBERS: HouseholdMember[] = [
  { id: "user-1", name: "Alex", email: "alex@example.com", avatar: "A", color: null, role: "admin", joined_at: "2024-01-01" },
  { id: "user-2", name: "Sam", email: "sam@example.com", avatar: "S", color: null, role: "member", joined_at: "2024-02-01" },
];

const MONDAY = "2024-06-10";
const TUESDAY = "2024-06-11";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    chore_id: "chore-1",
    assigned_user_id: "user-1",
    due_date: MONDAY,
    status: "pending",
    title: "Vacuum living room",
    estimated_duration_minutes: 20,
    frequency: "weekly",
    frequency_interval: null,
    room_name: "Kitchen",
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

function renderDashboard(overrides: Partial<Parameters<typeof DashboardClient>[0]> = {}) {
  return render(
    <DashboardClient
      initialDbUser={DB_USER}
      initialRooms={ROOMS}
      initialUsers={USERS}
      initialHouseholds={[]}
      initialInvitations={[]}
      initialFavoriteRoomIds={[]}
      initialFavoriteChoreIds={[]}
      initialViewMode="mine"
      initialWeekStart={MONDAY}
      initialSelectedDay={MONDAY}
      initialSelectedRoom="all"
      {...overrides}
    />
  );
}

describe("DashboardClient", () => {
  it("filters the task list by the selected day", async () => {
    const user = userEvent.setup();
    const mondayTask = makeTask({ id: "task-mon", title: "Monday chore", due_date: MONDAY });
    const tuesdayTask = makeTask({ id: "task-tue", title: "Tuesday chore", due_date: TUESDAY });
    renderDashboard({ initialTasks: [mondayTask, tuesdayTask] });

    expect(screen.getByText("Monday chore")).toBeInTheDocument();
    expect(screen.queryByText("Tuesday chore")).not.toBeInTheDocument();

    await user.click(screen.getByText("11"));

    // The outgoing card only leaves the DOM once its `AnimatePresence` exit
    // animation finishes, so wait for that instead of asserting synchronously.
    await waitFor(() => expect(screen.queryByText("Monday chore")).not.toBeInTheDocument());
    expect(screen.getByText("Tuesday chore")).toBeInTheDocument();
  });

  it("filters the task list by the selected room", async () => {
    const user = userEvent.setup();
    const kitchenTask = makeTask({ id: "task-kitchen", title: "Kitchen chore", room_id: "room-1" });
    const bathroomTask = makeTask({ id: "task-bathroom", title: "Bathroom chore", room_id: "room-2" });
    renderDashboard({ initialTasks: [kitchenTask, bathroomTask] });

    expect(screen.getByText("Kitchen chore")).toBeInTheDocument();
    expect(screen.getByText("Bathroom chore")).toBeInTheDocument();

    await user.click(screen.getByText("Bathroom"));

    // Same as above: wait for the filtered-out card's exit animation to finish.
    await waitFor(() => expect(screen.queryByText("Kitchen chore")).not.toBeInTheDocument());
    expect(screen.getByText("Bathroom chore")).toBeInTheDocument();
  });

  it("filters the task list by view mode (mine vs household)", async () => {
    const user = userEvent.setup();
    const myTask = makeTask({ id: "task-mine", title: "My chore", assigned_user_id: "user-1" });
    const otherTask = makeTask({ id: "task-other", title: "Roommate's chore", assigned_user_id: "user-2" });
    renderDashboard({ initialTasks: [myTask, otherTask] });

    expect(screen.getByText("My chore")).toBeInTheDocument();
    expect(screen.queryByText("Roommate's chore")).not.toBeInTheDocument();

    await user.click(screen.getByText("Household"));

    expect(screen.getByText("My chore")).toBeInTheDocument();
    expect(screen.getByText("Roommate's chore")).toBeInTheDocument();
  });

  it("completes a task through the finish-task drawer", async () => {
    const user = userEvent.setup();
    const task = makeTask({ id: "task-complete", title: "Wash dishes" });
    renderDashboard({ initialTasks: [task] });

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByText("Finish Task")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("e.g. 20"), "15");
    await user.click(screen.getByRole("button", { name: "Submit Completion" }));

    expect(completeTaskMock).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({ actual_duration_minutes: 15 })
    );
  });

  it("toggles a favorite room", async () => {
    const user = userEvent.setup();
    renderDashboard({ initialTasks: [] });

    const kitchenChip = screen.getByText("Kitchen").closest("button")!;
    const star = kitchenChip.querySelector("svg.lucide-star")!;

    expect(star).not.toHaveClass("fill-amber-400");

    await user.click(star);

    expect(toggleFavoriteRoomMock).toHaveBeenCalledWith("room-1");
    expect(kitchenChip.querySelector("svg.lucide-star")).toHaveClass("fill-amber-400");
  });

  it("lets a household admin remove a member from the Manage Household panel", async () => {
    const user = userEvent.setup();
    renderDashboard({
      initialTasks: [],
      initialHouseholds: ADMIN_HOUSEHOLDS,
      initialMembers: MEMBERS,
    });

    await user.click(screen.getByRole("button", { name: "Manage Household" }));
    expect(screen.getByText('Members of "Our Home"')).toBeInTheDocument();
    expect(screen.getByText("Sam")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove Sam" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(removeMemberMock).toHaveBeenCalledWith("user-2");
  });
});
