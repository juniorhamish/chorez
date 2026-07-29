"use server";

import { auth0 } from "@/lib/auth0";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateUserName(newName: string) {
  const session = await auth0.getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }

  const email = session.user.email;
  if (!email) {
    throw new Error("User email not found in session");
  }

  // 1. Ensure the user exists in the database
  const user = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;

  if (user.length === 0) {
    // No user found, check for a household
    const households = await sql`SELECT * FROM households LIMIT 1`;
    let householdId;

    if (households.length === 0) {
      // No households exist, create one
      const newHousehold = await sql`
        INSERT INTO households (name) VALUES ('My Home') RETURNING id
      `;
      householdId = newHousehold[0].id;
    } else {
      householdId = households[0].id;
    }

    // Create the user
    await sql`
      INSERT INTO users (email, full_name, household_id)
      VALUES (${email}, ${newName}, ${householdId})
    `;
  } else {
    // User exists, update their name
    await sql`
      UPDATE users 
      SET full_name = ${newName} 
      WHERE email = ${email}
    `;
  }

  revalidatePath("/dashboard");
}

export async function getDbUser() {
  const session = await auth0.getSession();
  if (!session) return null;

  const email = session.user.email;
  if (!email) return null;

  const users = await sql`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `;

  return users[0] || null;
}
