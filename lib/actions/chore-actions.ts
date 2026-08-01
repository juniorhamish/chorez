"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getDbUser } from "./user-actions";

export type ChoreFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'every-x-days'
  | 'every-x-weeks'
  | 'on-demand';

function calculateNextDueDate(
  fromDate: Date,
  frequency: ChoreFrequency,
  frequencyInterval: number | null | undefined
): Date {
  const nextDate = new Date(fromDate);

  if (frequency === 'daily') nextDate.setDate(fromDate.getDate() + 1);
  else if (frequency === 'weekly') nextDate.setDate(fromDate.getDate() + 7);
  else if (frequency === 'monthly') nextDate.setMonth(fromDate.getMonth() + 1);
  else if (frequency === 'yearly') nextDate.setFullYear(fromDate.getFullYear() + 1);
  else if (frequency === 'every-x-days') nextDate.setDate(fromDate.getDate() + (frequencyInterval || 1));
  else if (frequency === 'every-x-weeks') nextDate.setDate(fromDate.getDate() + (frequencyInterval || 1) * 7);
  else nextDate.setDate(fromDate.getDate() + 1); // Default to next day for on-demand initial? Or same day.

  return nextDate;
}

export async function getRooms() {
  const dbUser = await getDbUser();
  if (!dbUser || !dbUser.active_household_id) return [];

  return await sql`
    SELECT * FROM rooms WHERE household_id = ${dbUser.active_household_id} ORDER BY name ASC
  `;
}

export async function getHouseholdTasks() {
  const dbUser = await getDbUser();
  if (!dbUser || !dbUser.active_household_id) return [];

  // Fetch chore assignments with chore and room details
  return await sql`
    SELECT 
      ca.id,
      ca.chore_id,
      ca.assigned_user_id,
      ca.due_date,
      ca.status,
      ca.completed_at,
      ca.actual_duration_minutes,
      ca.effort_rating,
      ca.notes,
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
    WHERE ca.household_id = ${dbUser.active_household_id}
    ORDER BY ca.due_date ASC
  `;
}

export async function getHouseholdUsers() {
    const dbUser = await getDbUser();
    if (!dbUser || !dbUser.active_household_id) return [];
  
    return await sql`
      SELECT id, full_name as name, avatar_label as avatar, color_theme as color 
      FROM users 
      WHERE id IN (SELECT user_id FROM household_members WHERE household_id = ${dbUser.active_household_id})
    `;
}

export async function addChore(data: {
  title: string;
  room_id: string;
  estimated_duration_minutes: number;
  last_completed_date: string;
  frequency: ChoreFrequency;
  frequency_interval?: number | null;
}) {
  const dbUser = await getDbUser();
  if (!dbUser || !dbUser.active_household_id) throw new Error("User or active household not found");

  const { title, room_id, estimated_duration_minutes, last_completed_date, frequency } = data;
  const frequency_interval =
    frequency === 'every-x-days' || frequency === 'every-x-weeks' ? data.frequency_interval ?? 1 : null;

  // 1. Create the chore template
  const newChore = await sql`
    INSERT INTO chores (household_id, room_id, title, estimated_duration_minutes, frequency, frequency_interval)
    VALUES (${dbUser.active_household_id}, ${room_id}, ${title}, ${estimated_duration_minutes}, ${frequency}, ${frequency_interval})
    RETURNING id
  `;

  const choreId = newChore[0].id;

  // 2. Calculate next due date
  const lastDate = new Date(last_completed_date);
  const dueDate = calculateNextDueDate(lastDate, frequency, frequency_interval);

  // 3. Create initial assignment (unassigned for now, or assigned to creator?)
  await sql`
    INSERT INTO chore_assignments (chore_id, household_id, due_date, status)
    VALUES (${choreId}, ${dbUser.active_household_id}, ${dueDate.toISOString().split('T')[0]}, 'pending')
  `;

  revalidatePath("/dashboard");
}

export async function assignTaskToSelf(assignmentId: string) {
  const dbUser = await getDbUser();
  if (!dbUser || !dbUser.active_household_id) throw new Error("User or active household not found");

  await sql`
    UPDATE chore_assignments
    SET assigned_user_id = ${dbUser.id}
    WHERE id = ${assignmentId} AND household_id = ${dbUser.active_household_id}
  `;

  revalidatePath("/dashboard");
}

export async function addRoom(data: {
  name: string;
  icon_name: string;
}) {
  const dbUser = await getDbUser();
  if (!dbUser || !dbUser.active_household_id) throw new Error("User or active household not found");

  const { name, icon_name } = data;

  const newRoom = await sql`
    INSERT INTO rooms (household_id, name, icon_name)
    VALUES (${dbUser.active_household_id}, ${name}, ${icon_name})
    RETURNING id
  `;

  revalidatePath("/dashboard");

  return { id: newRoom[0].id as string };
}

export async function completeTask(assignmentId: string, data: {
  actual_duration_minutes: number;
  effort_rating?: number;
  notes?: string;
  completionDate?: string; // Optional YYYY-MM-DD from client to handle timezones correctly
}) {
  const dbUser = await getDbUser();
  if (!dbUser || !dbUser.active_household_id) throw new Error("User or active household not found");

  const { actual_duration_minutes, effort_rating, notes, completionDate: clientCompletionDate } = data;

  // 1. Get assignment and chore details
  const assignment = (await sql`
    SELECT ca.*, c.frequency, c.frequency_interval
    FROM chore_assignments ca
    JOIN chores c ON ca.chore_id = c.id
    WHERE ca.id = ${assignmentId} AND ca.household_id = ${dbUser.active_household_id}
  `)[0];

  if (!assignment) throw new Error("Assignment not found");

  // 2. Mark current assignment as completed
  await sql`
    UPDATE chore_assignments
    SET 
      status = 'completed',
      completed_at = CURRENT_TIMESTAMP,
      actual_duration_minutes = ${actual_duration_minutes},
      effort_rating = ${effort_rating},
      notes = ${notes},
      assigned_user_id = ${dbUser.id}
    WHERE id = ${assignmentId}
  `;

  // 3. Create next assignment if it's a repeated task
  const { chore_id, frequency, frequency_interval } = assignment;
  if (frequency && frequency !== 'on-demand') {
    // Use client-provided date if available, otherwise fallback to server local "day"
    // Note: Parsing YYYY-MM-DD string creates a Date at 00:00:00 UTC
    const completionDate = clientCompletionDate 
      ? new Date(clientCompletionDate) 
      : new Date();
    
    const nextDueDate = calculateNextDueDate(completionDate, frequency, frequency_interval);

    await sql`
      INSERT INTO chore_assignments (chore_id, household_id, due_date, status)
      VALUES (${chore_id}, ${dbUser.active_household_id}, ${nextDueDate.toISOString().split('T')[0]}, 'pending')
      ON CONFLICT DO NOTHING
    `;
  }

  revalidatePath("/dashboard");
}

