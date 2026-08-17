"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getDbUser } from "./user-actions";
import {
  calculateNextDueDate,
  clampDueDateToToday,
  isMoreFrequentThanWeekly,
  ensureUpcomingInstances,
} from "@/lib/scheduling";
import { getGravatarUrl } from "@/lib/gravatar";

export type ChoreFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'every-x-days'
  | 'every-x-weeks'
  | 'on-demand';

export async function getRooms() {
  const dbUser = await getDbUser();
  if (!dbUser?.active_household_id) return [];

  return await sql`
    SELECT * FROM rooms WHERE household_id = ${dbUser.active_household_id} ORDER BY name
  `;
}

export async function getHouseholdTasks() {
  const dbUser = await getDbUser();
  if (!dbUser?.active_household_id) return [];

  // Fetch chore assignments with chore and room details. Tasks whose chore
  // is private to another user are excluded entirely — private tasks are
  // only ever visible to the household member they were created for.
  const tasks = await sql`
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
      c.frequency,
      c.frequency_interval,
      c.private_to_user_id,
      r.name as room_name,
      r.id as room_id,
      u.full_name as assigned_user_name,
      u.avatar_label as assigned_user_avatar,
      u.email as assigned_user_email,
      u.color_theme as assigned_user_color
    FROM chore_assignments ca
    JOIN chores c ON ca.chore_id = c.id
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN users u ON ca.assigned_user_id = u.id
    WHERE ca.household_id = ${dbUser.active_household_id}
      AND (c.private_to_user_id IS NULL OR c.private_to_user_id = ${dbUser.id})
    ORDER BY ca.due_date
  `;

  return tasks.map((task) => ({
    ...task,
    is_private: task.private_to_user_id != null,
    assigned_user_avatar_url: getGravatarUrl(task.assigned_user_email as string | null),
  }));
}

export async function getHouseholdChores() {
  const dbUser = await getDbUser();
  if (!dbUser?.active_household_id) return [];

  // Fetch one row per chore template (not per due-dated assignment), joined
  // with its room and the earliest still-pending assignment (if any), so the
  // Task Library can show every chore that has been created for the
  // household regardless of whether it currently has an upcoming instance.
  // Chores private to another user are excluded entirely, matching the
  // visibility rule used by getHouseholdTasks().
  const chores = await sql`
    SELECT
      c.id,
      c.title,
      c.room_id,
      r.name as room_name,
      r.icon_name as room_icon_name,
      c.estimated_duration_minutes,
      c.frequency,
      c.frequency_interval,
      c.private_to_user_id,
      MIN(ca.due_date) FILTER (WHERE ca.status = 'pending') as next_due_date
    FROM chores c
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN chore_assignments ca ON ca.chore_id = c.id
    WHERE c.household_id = ${dbUser.active_household_id}
      AND (c.private_to_user_id IS NULL OR c.private_to_user_id = ${dbUser.id})
    GROUP BY c.id, r.name, r.icon_name
    ORDER BY r.name NULLS LAST, c.title
  `;

  return chores.map((chore) => ({
    ...chore,
    is_private: chore.private_to_user_id != null,
  }));
}

export async function getFavoriteRoomIds() {
  const dbUser = await getDbUser();
  if (!dbUser?.id) return [];

  const favorites = await sql`
    SELECT target_id FROM user_favorites
    WHERE user_id = ${dbUser.id} AND target_type = 'room'
  `;

  return favorites.map((f) => f.target_id as string);
}

export async function toggleFavoriteRoom(roomId: string) {
  const dbUser = await getDbUser();
  if (!dbUser?.id) throw new Error("User not found");

  const existing = await sql`
    SELECT 1 FROM user_favorites
    WHERE user_id = ${dbUser.id} AND target_type = 'room' AND target_id = ${roomId}
  `;

  if (existing.length > 0) {
    await sql`
      DELETE FROM user_favorites
      WHERE user_id = ${dbUser.id} AND target_type = 'room' AND target_id = ${roomId}
    `;
  } else {
    await sql`
      INSERT INTO user_favorites (user_id, target_type, target_id)
      VALUES (${dbUser.id}, 'room', ${roomId})
      ON CONFLICT DO NOTHING
    `;
  }

  revalidatePath("/dashboard");
}

export async function getFavoriteChoreIds() {
  const dbUser = await getDbUser();
  if (!dbUser?.id) return [];

  const favorites = await sql`
    SELECT target_id FROM user_favorites
    WHERE user_id = ${dbUser.id} AND target_type = 'chore'
  `;

  return favorites.map((f) => f.target_id as string);
}

export async function toggleFavoriteChore(choreId: string) {
  const dbUser = await getDbUser();
  if (!dbUser?.id) throw new Error("User not found");

  const existing = await sql`
    SELECT 1 FROM user_favorites
    WHERE user_id = ${dbUser.id} AND target_type = 'chore' AND target_id = ${choreId}
  `;

  if (existing.length > 0) {
    await sql`
      DELETE FROM user_favorites
      WHERE user_id = ${dbUser.id} AND target_type = 'chore' AND target_id = ${choreId}
    `;
  } else {
    await sql`
      INSERT INTO user_favorites (user_id, target_type, target_id)
      VALUES (${dbUser.id}, 'chore', ${choreId})
      ON CONFLICT DO NOTHING
    `;
  }

  revalidatePath("/dashboard");
}

export async function getHouseholdUsers() {
    const dbUser = await getDbUser();
    if (!dbUser?.active_household_id) return [];
  
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
  is_private?: boolean;
}) {
  const dbUser = await getDbUser();
  if (!dbUser?.active_household_id) throw new Error("User or active household not found");

  const { title, room_id, estimated_duration_minutes, last_completed_date, frequency } = data;
  const frequency_interval =
    frequency === 'every-x-days' || frequency === 'every-x-weeks' ? data.frequency_interval ?? 1 : null;
  // A private task is for its creator only: it's never visible to other
  // household members, and it can never be (re)assigned to anyone else —
  // including by the AI schedule optimizer, which excludes private chores
  // from consideration entirely.
  const private_to_user_id = data.is_private ? dbUser.id : null;

  // 1. Create the chore template
  const newChore = await sql`
    INSERT INTO chores (household_id, room_id, title, estimated_duration_minutes, frequency, frequency_interval, private_to_user_id)
    VALUES (${dbUser.active_household_id}, ${room_id}, ${title}, ${estimated_duration_minutes}, ${frequency}, ${frequency_interval}, ${private_to_user_id})
    RETURNING id
  `;

  const choreId = newChore[0].id;

  // 2. Create the initial pending assignment(s) (unassigned for now, unless
  // this is a private task, in which case it's always assigned to its
  // owner). Chores that recur more frequently than weekly (e.g. daily) get
  // one instance per occurrence across the rolling schedule horizon,
  // instead of a single "next" instance, so a different person can be
  // assigned each time it comes up.
  const lastDate = new Date(last_completed_date);
  if (isMoreFrequentThanWeekly(frequency, frequency_interval)) {
    await ensureUpcomingInstances(choreId, dbUser.active_household_id, frequency, frequency_interval, lastDate, private_to_user_id);
  } else {
    // If the last-completed date is old enough that the computed next due
    // date would still be in the past, clamp it to today instead.
    const dueDate = calculateNextDueDate(lastDate, frequency, frequency_interval);
    const dueDateStr = clampDueDateToToday(dueDate);
    await sql`
      INSERT INTO chore_assignments (chore_id, household_id, due_date, status, assigned_user_id)
      VALUES (${choreId}, ${dbUser.active_household_id}, ${dueDateStr}, 'pending', ${private_to_user_id})
      ON CONFLICT (chore_id, due_date) DO NOTHING
    `;
  }

  revalidatePath("/dashboard");
}

export async function deleteChore(choreId: string) {
  const dbUser = await getDbUser();
  if (!dbUser?.active_household_id) throw new Error("User or active household not found");

  // Deleting the chore template cascades (ON DELETE CASCADE) to remove every
  // chore_assignments row that references it, i.e. all past/upcoming
  // instances of this task.
  await sql`
    DELETE FROM chores
    WHERE id = ${choreId} AND household_id = ${dbUser.active_household_id}
  `;

  revalidatePath("/dashboard");
}

export async function updateChoreFrequency(
  choreId: string,
  frequency: ChoreFrequency,
  frequencyInterval?: number | null
) {
  const dbUser = await getDbUser();
  if (!dbUser?.active_household_id) throw new Error("User or active household not found");

  const resolvedInterval =
    frequency === 'every-x-days' || frequency === 'every-x-weeks' ? frequencyInterval ?? 1 : null;

  // 1. Update the chore template's recurrence settings.
  const updated = (await sql`
    UPDATE chores
    SET frequency = ${frequency}, frequency_interval = ${resolvedInterval}
    WHERE id = ${choreId} AND household_id = ${dbUser.active_household_id}
    RETURNING id, private_to_user_id
  `)[0];

  if (!updated) throw new Error("Chore not found");

  const privateToUserId = updated.private_to_user_id as string | null;

  // 2. Reevaluate the next due date based on the most recent completion date
  // (falling back to today if it has never been completed) and the new frequency.
  const lastCompletion = (await sql`
    SELECT completed_at FROM chore_assignments
    WHERE chore_id = ${choreId} AND status = 'completed' AND completed_at IS NOT NULL
    ORDER BY completed_at DESC
    LIMIT 1
  `)[0];

  const baseDate = lastCompletion ? new Date(lastCompletion.completed_at) : new Date();

  // 3. Clear out today's/future pending instances so the schedule can be
  // regenerated to match the new recurrence settings, then repopulate it:
  // a full rolling schedule of instances for chores that recur more
  // frequently than weekly (e.g. daily), or a single "next" instance
  // otherwise.
  await sql`
    DELETE FROM chore_assignments
    WHERE chore_id = ${choreId} AND household_id = ${dbUser.active_household_id}
      AND status = 'pending' AND due_date >= CURRENT_DATE
  `;

  if (isMoreFrequentThanWeekly(frequency, resolvedInterval)) {
    await ensureUpcomingInstances(choreId, dbUser.active_household_id, frequency, resolvedInterval, baseDate, privateToUserId);
  } else {
    const nextDueDate = calculateNextDueDate(baseDate, frequency, resolvedInterval);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];
    await sql`
      INSERT INTO chore_assignments (chore_id, household_id, due_date, status, assigned_user_id)
      VALUES (${choreId}, ${dbUser.active_household_id}, ${nextDueDateStr}, 'pending', ${privateToUserId})
      ON CONFLICT (chore_id, due_date) DO NOTHING
    `;
  }

  revalidatePath("/dashboard");
}

export async function updateChoreRoom(choreId: string, roomId: string) {
  const dbUser = await getDbUser();
  if (!dbUser?.active_household_id) throw new Error("User or active household not found");

  // Ensure the target room belongs to the same household before reassigning.
  const room = (await sql`
    SELECT id FROM rooms
    WHERE id = ${roomId} AND household_id = ${dbUser.active_household_id}
  `)[0];

  if (!room) throw new Error("Room not found");

  const updated = (await sql`
    UPDATE chores
    SET room_id = ${roomId}
    WHERE id = ${choreId} AND household_id = ${dbUser.active_household_id}
    RETURNING id
  `)[0];

  if (!updated) throw new Error("Chore not found");

  revalidatePath("/dashboard");
}

export async function deleteTaskInstance(assignmentId: string) {
  const dbUser = await getDbUser();
  if (!dbUser?.active_household_id) throw new Error("User or active household not found");

  // 1. Look up the instance and its chore's recurrence settings before removing it.
  const assignment = (await sql`
    SELECT ca.id, ca.chore_id, c.frequency, c.frequency_interval, c.private_to_user_id
    FROM chore_assignments ca
    JOIN chores c ON ca.chore_id = c.id
    WHERE ca.id = ${assignmentId} AND ca.household_id = ${dbUser.active_household_id}
  `)[0];

  if (!assignment) throw new Error("Assignment not found");

  const { chore_id, frequency, frequency_interval, private_to_user_id } = assignment;

  // 2. Remove just this single occurrence (not the chore template, and not
  // its other past/upcoming instances).
  await sql`
    DELETE FROM chore_assignments
    WHERE id = ${assignmentId} AND household_id = ${dbUser.active_household_id}
  `;

  // 3. If the task repeats and no other pending instance remains, reevaluate
  // the next due date based on the most recent completion date (falling back
  // to today if it has never been completed) and the chore's frequency.
  if (frequency && frequency !== 'on-demand') {
    const remainingPending = (await sql`
      SELECT 1 FROM chore_assignments
      WHERE chore_id = ${chore_id} AND status = 'pending'
      LIMIT 1
    `)[0];

    if (!remainingPending) {
      const lastCompletion = (await sql`
        SELECT completed_at FROM chore_assignments
        WHERE chore_id = ${chore_id} AND status = 'completed' AND completed_at IS NOT NULL
        ORDER BY completed_at DESC
        LIMIT 1
      `)[0];

      const baseDate = lastCompletion ? new Date(lastCompletion.completed_at) : new Date();

      if (isMoreFrequentThanWeekly(frequency, frequency_interval)) {
        await ensureUpcomingInstances(chore_id, dbUser.active_household_id, frequency, frequency_interval, baseDate, private_to_user_id);
      } else {
        const nextDueDate = calculateNextDueDate(baseDate, frequency, frequency_interval);
        await sql`
          INSERT INTO chore_assignments (chore_id, household_id, due_date, status, assigned_user_id)
          VALUES (${chore_id}, ${dbUser.active_household_id}, ${nextDueDate.toISOString().split('T')[0]}, 'pending', ${private_to_user_id})
          ON CONFLICT (chore_id, due_date) DO NOTHING
        `;
      }
    }
  }

  revalidatePath("/dashboard");
}

export async function assignTaskToSelf(assignmentId: string) {
  const dbUser = await getDbUser();
  if (!dbUser?.active_household_id) throw new Error("User or active household not found");

  // Private tasks are permanently pinned to their owner and can never be
  // (re)assigned to anyone else, so guard against a stale "Assign to Me"
  // action targeting one that belongs to a different user.
  await sql`
    UPDATE chore_assignments ca
    SET assigned_user_id = ${dbUser.id}
    FROM chores c
    WHERE ca.id = ${assignmentId}
      AND ca.household_id = ${dbUser.active_household_id}
      AND ca.chore_id = c.id
      AND (c.private_to_user_id IS NULL OR c.private_to_user_id = ${dbUser.id})
  `;

  revalidatePath("/dashboard");
}

export async function addRoom(data: {
  name: string;
  icon_name: string;
}) {
  const dbUser = await getDbUser();
  if (!dbUser?.active_household_id) throw new Error("User or active household not found");

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
  actual_duration_minutes?: number;
  effort_rating?: number;
  notes?: string;
  completionDate?: string; // Optional YYYY-MM-DD from client to handle timezones correctly
}) {
  const dbUser = await getDbUser();
  if (!dbUser?.active_household_id) throw new Error("User or active household not found");

  const { actual_duration_minutes, effort_rating, notes } = data;
  const hasSetTime = actual_duration_minutes !== undefined && actual_duration_minutes !== null && !Number.isNaN(actual_duration_minutes);

  // 1. Get assignment and chore details
  const assignment = (await sql`
    SELECT ca.*, c.frequency, c.frequency_interval, c.private_to_user_id, h.timezone as household_timezone
    FROM chore_assignments ca
    JOIN chores c ON ca.chore_id = c.id
    JOIN households h ON ca.household_id = h.id
    WHERE ca.id = ${assignmentId} AND ca.household_id = ${dbUser.active_household_id}
  `)[0];

  if (!assignment) throw new Error("Assignment not found");

  // 2. Mark current assignment as completed
  await sql`
    UPDATE chore_assignments
    SET 
      status = 'completed',
      completed_at = CURRENT_TIMESTAMP,
      actual_duration_minutes = ${hasSetTime ? actual_duration_minutes : null},
      effort_rating = ${effort_rating},
      notes = ${notes},
      assigned_user_id = ${dbUser.id}
    WHERE id = ${assignmentId}
  `;

  // 3. If time taken was set, update the chore's estimated duration to the average of all actual durations so far
  const { chore_id, frequency, frequency_interval, private_to_user_id, household_timezone } = assignment;
  if (hasSetTime) {
    await sql`
      UPDATE chores
      SET estimated_duration_minutes = (
        SELECT ROUND(AVG(actual_duration_minutes))::INTEGER
        FROM chore_assignments
        WHERE chore_id = ${chore_id}
          AND status = 'completed'
          AND actual_duration_minutes IS NOT NULL
      )
      WHERE id = ${chore_id}
    `;
  }

  // 4. Create the next assignment(s) if it's a repeated task. Chores that
  // recur more frequently than weekly (e.g. daily) get the rolling schedule
  // horizon topped up with one instance per occurrence, instead of just the
  // single next one, so a different person can be assigned each time it
  // comes up.
  if (frequency && frequency !== 'on-demand') {
    const tz = household_timezone || "Europe/London";
    const now = new Date();
    const currentDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const completionDate = new Date(currentDateStr);

    if (isMoreFrequentThanWeekly(frequency, frequency_interval)) {
      await ensureUpcomingInstances(chore_id, dbUser.active_household_id, frequency, frequency_interval, completionDate, private_to_user_id);
    } else {
      const nextDueDate = calculateNextDueDate(completionDate, frequency, frequency_interval);
      await sql`
        INSERT INTO chore_assignments (chore_id, household_id, due_date, status, assigned_user_id)
        VALUES (${chore_id}, ${dbUser.active_household_id}, ${nextDueDate.toISOString().split('T')[0]}, 'pending', ${private_to_user_id})
        ON CONFLICT (chore_id, due_date) DO NOTHING
      `;
    }
  }

  revalidatePath("/dashboard");
}

