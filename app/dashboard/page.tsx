import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth0 } from "@/lib/auth0";
import DashboardClient from "./dashboard-client";
import type { Task, Room, HouseholdUser, Household, HouseholdMember, Invitation } from "@/lib/dashboard/types";
import { getDbUser, getHouseholds, getHouseholdMembers, getInvitations } from "@/lib/actions/user-actions";
import { getHouseholdTasks, getRooms, getHouseholdUsers, getFavoriteRoomIds, getFavoriteChoreIds } from "@/lib/actions/chore-actions";
import { getLatestUndoableOptimizationRun } from "@/lib/actions/schedule-optimization-actions";

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login?returnTo=/dashboard");
  }

  const cookieStore = await cookies();
  const initialViewMode = (cookieStore.get("chorez_view_mode")?.value as 'mine' | 'household' | undefined) ?? 'mine';
  const initialWeekStartStr = cookieStore.get("chorez_week_start")?.value;
  const initialSelectedDayStr = cookieStore.get("chorez_selected_day")?.value;
  const initialSelectedRoom = cookieStore.get("chorez_selected_room")?.value ?? 'all';

  const [dbUser, tasks, rooms, users, households, members, invitations, favoriteRoomIds, favoriteChoreIds, lastOptimizationRun] = await Promise.all([
    getDbUser(),
    getHouseholdTasks(),
    getRooms(),
    getHouseholdUsers(),
    getHouseholds(),
    getHouseholdMembers(),
    getInvitations(),
    getFavoriteRoomIds(),
    getFavoriteChoreIds(),
    getLatestUndoableOptimizationRun(),
  ]);

  return (
    <DashboardClient 
      initialDbUser={dbUser} 
      initialTasks={tasks as Task[]} 
      initialRooms={rooms as Room[]} 
      initialUsers={users as HouseholdUser[]}
      initialHouseholds={households as Household[]}
      initialMembers={members as HouseholdMember[]}
      initialInvitations={invitations as Invitation[]}
      initialFavoriteRoomIds={favoriteRoomIds}
      initialFavoriteChoreIds={favoriteChoreIds}
      initialLastOptimizationRun={lastOptimizationRun}
      initialViewMode={initialViewMode}
      initialWeekStart={initialWeekStartStr}
      initialSelectedDay={initialSelectedDayStr}
      initialSelectedRoom={initialSelectedRoom}
    />
  );
}
