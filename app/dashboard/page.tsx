import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import DashboardClient, { type Task, type Room, type HouseholdUser, type Household, type Invitation } from "./dashboard-client";
import { getDbUser, getHouseholds, getInvitations } from "@/lib/actions/user-actions";
import { getHouseholdTasks, getRooms, getHouseholdUsers } from "@/lib/actions/chore-actions";

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login?returnTo=/dashboard");
  }

  const [dbUser, tasks, rooms, users, households, invitations] = await Promise.all([
    getDbUser(),
    getHouseholdTasks(),
    getRooms(),
    getHouseholdUsers(),
    getHouseholds(),
    getInvitations(),
  ]);

  return (
    <DashboardClient 
      initialDbUser={dbUser} 
      initialTasks={tasks as unknown as Task[]} 
      initialRooms={rooms as unknown as Room[]} 
      initialUsers={users as unknown as HouseholdUser[]}
      initialHouseholds={households as unknown as Household[]}
      initialInvitations={invitations as unknown as Invitation[]}
    />
  );
}
