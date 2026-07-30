import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import DashboardClient, { type Task, type Room, type HouseholdUser } from "./dashboard-client";
import { getDbUser } from "@/lib/actions/user-actions";
import { getHouseholdTasks, getRooms, getHouseholdUsers } from "@/lib/actions/chore-actions";

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login?returnTo=/dashboard");
  }

  const [dbUser, tasks, rooms, users] = await Promise.all([
    getDbUser(),
    getHouseholdTasks(),
    getRooms(),
    getHouseholdUsers(),
  ]);

  return (
    <DashboardClient 
      initialDbUser={dbUser} 
      initialTasks={tasks as unknown as Task[]} 
      initialRooms={rooms as unknown as Room[]} 
      initialUsers={users as unknown as HouseholdUser[]}
    />
  );
}
