import { sql } from "@/lib/db";
import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscription, timezone } = await req.json();

  if (!subscription) {
    return NextResponse.json({ error: "Subscription is required" }, { status: 400 });
  }

  // Get DB user id
  const user = (await sql`SELECT id FROM users WHERE email = ${session.user.email} LIMIT 1`)[0];
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Save subscription and update timezone
  await sql`
    INSERT INTO push_subscriptions (user_id, subscription_json)
    VALUES (${user.id}, ${JSON.stringify(subscription)})
    ON CONFLICT (user_id, subscription_json) DO NOTHING
  `;

  if (timezone) {
    await sql`
      UPDATE users SET timezone = ${timezone} WHERE id = ${user.id}
    `;
  }

  return NextResponse.json({ success: true });
}
