import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import webpush from "web-push";

// Initialize web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@chorez.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  console.log("Cron job triggered notifications");
  // Simple auth check for the cron job (could be a secret header)
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all users with subscriptions
  const usersWithSubs = await sql`
    SELECT u.id, u.full_name, u.timezone, ps.subscription_json
    FROM users u
    JOIN push_subscriptions ps ON u.id = ps.user_id
  `;

  const results = [];

  for (const user of usersWithSubs) {
    try {
      const now = new Date();
      const userTime = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: user.timezone || "UTC"
      }).format(now);

      const hour = parseInt(userTime, 10);
      let type: 'morning' | 'evening' | null = null;

      if (hour === 8) type = 'morning';
      else if (hour === 20) type = 'evening';

      if (!type) continue;

      // Check tasks for today
      const today = now.toISOString().split('T')[0];
      const tasks = await sql`
        SELECT title, status 
        FROM chore_assignments ca
        JOIN chores c ON ca.chore_id = c.id
        WHERE ca.assigned_user_id = ${user.id} 
          AND ca.due_date = ${today}
      `;

      if (tasks.length === 0) continue;

      const outstandingTasks = tasks.filter(t => t.status !== 'completed');

      let body = "";
      if (type === 'morning') {
        body = `Good morning! You have ${tasks.length} task${tasks.length === 1 ? "" : "s"} scheduled for today.`;
      } else if (type === 'evening' && outstandingTasks.length > 0) {
        body = `Don't forget! You still have ${outstandingTasks.length} outstanding task${outstandingTasks.length === 1 ? "" : "s"} to complete today.`;
      } else {
        // No need for evening notification if everything is done
        continue;
      }

      await webpush.sendNotification(
        user.subscription_json,
        JSON.stringify({
          title: "Chorez Reminder",
          body,
          url: "/dashboard"
        })
      );
      results.push({ userId: user.id, success: true });
    } catch (error) {
      console.error(`Failed to send push to user ${user.id}:`, error);
      results.push({ userId: user.id, success: false, error: (error as any).message });
    }
  }

  return NextResponse.json({ results });
}

// Also support GET for easy manual testing (if no secret is set)
export async function GET(req: Request) {
    return POST(req);
}
