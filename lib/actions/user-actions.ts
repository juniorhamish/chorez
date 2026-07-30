"use server";

import { auth0 } from "@/lib/auth0";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cache } from "react";

export async function updateUserName(newName: string) {
  const user = await getDbUser();
  if (!user) {
    throw new Error("User not found or not authenticated");
  }

  // Update their name
  await sql`
    UPDATE users 
    SET full_name = ${newName} 
    WHERE id = ${user.id}
  `;

  revalidatePath("/dashboard");
}

export const getDbUser = cache(async () => {
  const session = await auth0.getSession();
  if (!session) return null;

  const email = session.user.email;
  const name = session.user.name;
  if (!email) return null;

  // 1. Try to get user first.
  let user = (await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`)[0];
  
  if (!user) {
    // 2. User doesn't exist. Create the user record FIRST (without household).
    // This gives us a stable user.id to coordinate around.
    const newUserResult = await sql`
      INSERT INTO users (email, full_name)
      VALUES (${email}, ${name})
      ON CONFLICT (email) DO UPDATE SET 
        full_name = COALESCE(users.full_name, EXCLUDED.full_name)
      RETURNING *
    `;
    user = newUserResult[0];
  }

  // 3. Now ensure they have at least one household membership.
  const memberships = await sql`SELECT household_id FROM household_members WHERE user_id = ${user.id} LIMIT 1`;

  if (memberships.length === 0) {
    // Check invitations first.
    const invitations = await sql`
      SELECT * FROM household_invitations 
      WHERE invitee_email = ${email} AND status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 1
    `;

    let householdId;
    if (invitations.length > 0) {
      householdId = invitations[0].household_id;
    } else {
      // Create new household, but only if we still don't have one!
      // This query is atomic.
      const newHousehold = await sql`
        INSERT INTO households (name)
        SELECT ${name ? `${name}'s Home` : 'My Home'}
        WHERE NOT EXISTS (SELECT 1 FROM household_members WHERE user_id = ${user.id})
        RETURNING id
      `;
      
      if (newHousehold.length > 0) {
        householdId = newHousehold[0].id;
      } else {
        // Someone else already provisioned us. Re-fetch membership.
        const refetchedMembership = await sql`SELECT household_id FROM household_members WHERE user_id = ${user.id} LIMIT 1`;
        if (refetchedMembership.length > 0) {
          householdId = refetchedMembership[0].household_id;
        }
      }
    }

    if (householdId) {
      // Add to membership
      await sql`
        INSERT INTO household_members (user_id, household_id, role)
        VALUES (${user.id}, ${householdId}, ${invitations.length > 0 ? 'member' : 'admin'})
        ON CONFLICT (user_id, household_id) DO NOTHING
      `;
      
      // Update active_household_id if needed
      if (!user.active_household_id) {
         await sql`UPDATE users SET active_household_id = ${householdId} WHERE id = ${user.id} AND active_household_id IS NULL`;
         user.active_household_id = householdId;
      }
    }
  }

  // 4. Ensure active_household_id is set if they are a member of any
  if (!user.active_household_id) {
    const memberOf = await sql`SELECT household_id FROM household_members WHERE user_id = ${user.id} LIMIT 1`;
    if (memberOf.length > 0) {
      const hId = memberOf[0].household_id;
      await sql`UPDATE users SET active_household_id = ${hId} WHERE id = ${user.id} AND active_household_id IS NULL`;
      user.active_household_id = hId;
    }
  }

  return user;
});

export async function getHouseholds() {
  const user = await getDbUser();
  if (!user) return [];

  return await sql`
    SELECT h.*, hm.role
    FROM households h
    JOIN household_members hm ON h.id = hm.household_id
    WHERE hm.user_id = ${user.id}
    ORDER BY h.created_at ASC
  `;
}

export async function switchHousehold(householdId: string) {
  const user = await getDbUser();
  if (!user) throw new Error("Not authenticated");

  // Verify membership
  const membership = await sql`
    SELECT 1 FROM household_members 
    WHERE user_id = ${user.id} AND household_id = ${householdId}
  `;

  if (membership.length === 0) {
    throw new Error("Not a member of this household");
  }

  await sql`
    UPDATE users 
    SET active_household_id = ${householdId} 
    WHERE id = ${user.id}
  `;

  revalidatePath("/dashboard");
}

export async function inviteUser(email: string) {
  const user = await getDbUser();
  if (!user || !user.active_household_id) throw new Error("No active household");

  // Check if already a member
  const existingMember = await sql`
    SELECT 1 FROM users u
    JOIN household_members hm ON u.id = hm.user_id
    WHERE u.email = ${email} AND hm.household_id = ${user.active_household_id}
  `;

  if (existingMember.length > 0) {
    throw new Error("User is already a member of this household");
  }

  // Check if already invited
  const existingInvite = await sql`
    SELECT 1 FROM household_invitations 
    WHERE invitee_email = ${email} AND household_id = ${user.active_household_id} AND status = 'pending'
  `;

  if (existingInvite.length > 0) {
    throw new Error("User is already invited to this household");
  }

  await sql`
    INSERT INTO household_invitations (household_id, inviter_user_id, invitee_email)
    VALUES (${user.active_household_id}, ${user.id}, ${email})
  `;

  revalidatePath("/dashboard");
}

export async function getInvitations() {
  const session = await auth0.getSession();
  if (!session || !session.user.email) return [];

  return await sql`
    SELECT hi.*, h.name as household_name, u.full_name as inviter_name
    FROM household_invitations hi
    JOIN households h ON hi.household_id = h.id
    JOIN users u ON hi.inviter_user_id = u.id
    WHERE hi.invitee_email = ${session.user.email} AND hi.status = 'pending'
  `;
}

export async function respondToInvitation(invitationId: string, status: 'accepted' | 'declined') {
  const session = await auth0.getSession();
  if (!session || !session.user.email) throw new Error("Not authenticated");

  const invitation = (await sql`
    SELECT * FROM household_invitations 
    WHERE id = ${invitationId} AND invitee_email = ${session.user.email} AND status = 'pending'
  `)[0];

  if (!invitation) throw new Error("Invitation not found");

  if (status === 'accepted') {
    // 1. Ensure user exists in DB
    let user = (await sql`SELECT * FROM users WHERE email = ${session.user.email} LIMIT 1`)[0];
    
    if (!user) {
      // Create user if they don't exist yet (invited before first login)
      // Handle race condition with ON CONFLICT
      const newUser = await sql`
        INSERT INTO users (email, full_name, active_household_id)
        VALUES (${session.user.email}, ${session.user.name}, ${invitation.household_id})
        ON CONFLICT (email) DO UPDATE SET 
          full_name = COALESCE(users.full_name, EXCLUDED.full_name),
          active_household_id = COALESCE(users.active_household_id, EXCLUDED.active_household_id)
        RETURNING *
      `;
      user = newUser[0];
    }

    // 2. Add to household_members
    await sql`
      INSERT INTO household_members (user_id, household_id, role)
      VALUES (${user.id}, ${invitation.household_id}, 'member')
      ON CONFLICT (user_id, household_id) DO NOTHING
    `;

    // 3. Set as active household
    await sql`
      UPDATE users SET active_household_id = ${invitation.household_id} WHERE id = ${user.id}
    `;
  }

  // Update invitation status
  await sql`
    UPDATE household_invitations SET status = ${status} WHERE id = ${invitationId}
  `;

  revalidatePath("/dashboard");
}
