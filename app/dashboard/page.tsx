import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import DashboardClient from "./dashboard-client";
import { getDbUser } from "@/lib/actions/user-actions";

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login?returnTo=/dashboard");
  }

  const dbUser = await getDbUser();

  return <DashboardClient initialDbUser={dbUser} />;
}
