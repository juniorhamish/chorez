import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth0 } from "@/lib/auth0";
import DashboardClient, { type Task, type Room, type HouseholdUser, type Household, type Invitation } from "./dashboard-client";
import { getDbUser, getHouseholds, getInvitations } from "@/lib/actions/user-actions";
import { getHouseholdTasks, getRooms, getHouseholdUsers, getFavoriteRoomIds, getFavoriteChoreIds } from "@/lib/actions/chore-actions";

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

  const [dbUser, tasks, rooms, users, households, invitations, favoriteRoomIds, favoriteChoreIds] = await Promise.all([
    getDbUser(),
    getHouseholdTasks(),
    getRooms(),
    getHouseholdUsers(),
    getHouseholds(),
    getInvitations(),
    getFavoriteRoomIds(),
    getFavoriteChoreIds(),
  ]);

  return (
    <DashboardClient 
      initialDbUser={dbUser} 
      initialTasks={tasks as unknown as Task[]} 
      initialRooms={rooms as unknown as Room[]} 
      initialUsers={users as unknown as HouseholdUser[]}
      initialHouseholds={households as unknown as Household[]}
      initialInvitations={invitations as unknown as Invitation[]}
      initialFavoriteRoomIds={favoriteRoomIds}
      initialFavoriteChoreIds={favoriteChoreIds}
      initialViewMode={initialViewMode}
      initialWeekStart={initialWeekStartStr}
      initialSelectedDay={initialSelectedDayStr}
      initialSelectedRoom={initialSelectedRoom}
    />
  );
}
