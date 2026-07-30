"use server";

import { auth0 } from "@/lib/auth0";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getRooms() {
  const session = await auth0.getSession();
  if (!session) return [];

  const dbUser = await getDbUserByEmail(session.user.email);
  if (!dbUser) return [];

  return await sql`
    SELECT * FROM rooms WHERE household_id = ${dbUser.household_id} ORDER BY name ASC
  `;
}

export async function getHouseholdTasks() {
  const session = await auth0.getSession();
  if (!session) return [];

  const dbUser = await getDbUserByEmail(session.user.email);
  if (!dbUser) return [];

  // Fetch chore assignments with chore and room details
  return await sql`
    SELECT 
      ca.id,
      ca.chore_id,
      ca.assigned_user_id,
      ca.due_date,
      ca.status,
      c.title,
      c.estimated_duration_minutes,
      r.name as room_name,
      r.id as room_id,
      u.full_name as assigned_user_name,
      u.avatar_label as assigned_user_avatar,
      u.color_theme as assigned_user_color
    FROM chore_assignments ca
    JOIN chores c ON ca.chore_id = c.id
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN users u ON ca.assigned_user_id = u.id
    WHERE ca.household_id = ${dbUser.household_id}
    ORDER BY ca.due_date ASC
  `;
}

export async function getHouseholdUsers() {
    const session = await auth0.getSession();
    if (!session) return [];
  
    const dbUser = await getDbUserByEmail(session.user.email);
    if (!dbUser) return [];
  
    return await sql`
      SELECT id, full_name as name, avatar_label as avatar, color_theme as color 
      FROM users 
      WHERE household_id = ${dbUser.household_id}
    `;
}

export async function addChore(data: {
  title: string;
  room_id: string;
  estimated_duration_minutes: number;
  last_completed_date: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'on-demand';
}) {
  const session = await auth0.getSession();
  if (!session) throw new Error("Not authenticated");

  const dbUser = await getDbUserByEmail(session.user.email);
  if (!dbUser) throw new Error("User not found in DB");

  const { title, room_id, estimated_duration_minutes, last_completed_date, frequency } = data;

  // 1. Create the chore template
  const newChore = await sql`
    INSERT INTO chores (household_id, room_id, title, estimated_duration_minutes, frequency)
    VALUES (${dbUser.household_id}, ${room_id}, ${title}, ${estimated_duration_minutes}, ${frequency})
    RETURNING id
  `;

  const choreId = newChore[0].id;

  // 2. Calculate next due date
  const lastDate = new Date(last_completed_date);
  const dueDate = new Date(lastDate);
  
  if (frequency === 'daily') dueDate.setDate(lastDate.getDate() + 1);
  else if (frequency === 'weekly') dueDate.setDate(lastDate.getDate() + 7);
  else if (frequency === 'monthly') dueDate.setMonth(lastDate.getMonth() + 1);
  else dueDate.setDate(lastDate.getDate() + 1); // Default to next day for on-demand initial? Or same day.

  // 3. Create initial assignment (unassigned for now, or assigned to creator?)
  await sql`
    INSERT INTO chore_assignments (chore_id, household_id, due_date, status)
    VALUES (${choreId}, ${dbUser.household_id}, ${dueDate.toISOString().split('T')[0]}, 'pending')
  `;

  revalidatePath("/dashboard");
}

export async function addRoom(data: {
  name: string;
  icon_name: string;
}) {
  const session = await auth0.getSession();
  if (!session) throw new Error("Not authenticated");

  const dbUser = await getDbUserByEmail(session.user.email);
  if (!dbUser) throw new Error("User not found in DB");

  const { name, icon_name } = data;

  const newRoom = await sql`
    INSERT INTO rooms (household_id, name, icon_name)
    VALUES (${dbUser.household_id}, ${name}, ${icon_name})
    RETURNING id
  `;

  revalidatePath("/dashboard");

  return { id: newRoom[0].id as string };
}

export async function completeTask(assignmentId: string, data: {
  actual_duration_minutes: number;
  effort_rating: number;
  notes?: string;
}) {
  const session = await auth0.getSession();
  if (!session) throw new Error("Not authenticated");

  const dbUser = await getDbUserByEmail(session.user.email);
  if (!dbUser) throw new Error("User not found in DB");

  const { actual_duration_minutes, effort_rating, notes } = data;

  await sql`
    UPDATE chore_assignments
    SET 
      status = 'completed',
      completed_at = CURRENT_TIMESTAMP,
      actual_duration_minutes = ${actual_duration_minutes},
      effort_rating = ${effort_rating},
      notes = ${notes}
    WHERE id = ${assignmentId} AND household_id = ${dbUser.household_id}
  `;

  // Optional: Create the next assignment based on frequency
  // For now, let's just mark it as complete.

  revalidatePath("/dashboard");
}

async function getDbUserByEmail(email: string | undefined) {
  if (!email) return null;
  const users = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return users[0] || null;
}
