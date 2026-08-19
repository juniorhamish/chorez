// Thin wrapper around the Google Gemini REST API used to optimise the weekly
// chore schedule (assignments + due dates) for a single household.
//
// We call the REST API directly (rather than pulling in the @google/genai
// SDK) to keep the dependency footprint small, matching the rest of this
// project's "plain fetch" style for third-party integrations.

export type ScheduleAction =
  | {
      type: "assign";
      assignmentId: string;
      userId: string | null;
      reason?: string;
    }
  | {
      type: "reschedule";
      assignmentId: string;
      newDueDate: string;
      reason?: string;
    };

export interface HouseholdOptimizationPayload {
  household: {
    id: string;
    name: string;
    today: string; // YYYY-MM-DD, household-local "today"
    weekStart: string; // YYYY-MM-DD
    weekEnd: string; // YYYY-MM-DD (inclusive, 6 days after weekStart)
  };
  users: Array<{
    id: string;
    name: string;
    favoriteRooms: string[];
    roomRatings: Array<{ room: string | null; averageRating: number; ratedCount: number }>;
    choreRatings: Array<{ chore: string; averageRating: number; ratedCount: number }>;
  }>;
  upcomingTasks: Array<{
    assignmentId: string;
    chore: string;
    room: string | null;
    dueDate: string;
    estimatedDurationMinutes: number | null;
    currentlyAssignedUserId: string | null;
  }>;
}

const DEFAULT_MODEL = "gemini-1.5-flash";

// Building the response schema per-request (rather than as a static constant)
// lets us constrain "assignmentId" and "userId" to an enum of the actual ids
// present in this household's payload, so Gemini's structured output can only
// ever pick one of the real ids — it cannot invent, truncate or annotate one.
function buildResponseSchema(payload: HouseholdOptimizationPayload) {
  const userIds = payload.users.map((u) => u.id);
  const assignmentIds = payload.upcomingTasks.map((t) => t.assignmentId);

  return {
    type: "OBJECT",
    properties: {
      actions: {
        type: "ARRAY",
        description:
          "Ordered list of actions to apply to the household's chore assignments for the upcoming week.",
        items: {
          type: "OBJECT",
          properties: {
            type: {
              type: "STRING",
              enum: ["assign", "reschedule"],
              description:
                "'assign' sets the assignee for a chore assignment. 'reschedule' moves its due date.",
            },
            assignmentId: {
              type: "STRING",
              enum: assignmentIds,
              description:
                "The 'assignmentId' of one of the objects in upcomingTasks. Must be exactly one of the provided ids — nothing else.",
            },
            userId: {
              type: "STRING",
              enum: userIds,
              nullable: true,
              description:
                "Required for 'assign' actions: the 'id' of one of the objects in users. Must be exactly one of the provided ids, or null to unassign — nothing else.",
            },
            newDueDate: {
              type: "STRING",
              nullable: true,
              description: "Required for 'reschedule' actions: the new due date in YYYY-MM-DD format, within the given week.",
            },
            reason: {
              type: "STRING",
              nullable: true,
              description: "One short sentence explaining why this action helps satisfy the optimisation rules.",
            },
          },
          required: ["type", "assignmentId"],
        },
      },
    },
    required: ["actions"],
  };
}

function buildPrompt(payload: HouseholdOptimizationPayload): string {
  const userIdList = payload.users.map((u) => `"${u.id}" (${u.name})`).join(", ");
  const assignmentIdList = payload.upcomingTasks.map((t) => `"${t.assignmentId}"`).join(", ");

  return `You are optimising the weekly household chore schedule for a single household in the "Chorez" app.

Data structure (Household data JSON below):
- "users" is the array of every user who belongs to this household. Each user has an opaque "id" (a UUID string) plus a "name", "favoriteRooms", "roomRatings" and "choreRatings" used only to decide preferences — never to identify a user.
- "upcomingTasks" is the array of chore assignments in scope for this week. Each task has an opaque "assignmentId" (a UUID string) identifying the chore assignment row, plus "chore", "room", "dueDate", "estimatedDurationMinutes" and "currentlyAssignedUserId" (which, if set, is one of the ids in "users").

Apply ALL of the following rules, in priority order:
1. Assign tasks to users based on their previous ratings of similar tasks/rooms. Prefer giving a user tasks they have rated highly in the past (higher "averageRating" = they enjoyed/preferred it).
2. Assign tasks based on room preferences: a user's "favoriteRooms" should be prioritised for that user over rooms they haven't favourited.
3. Keep the assignments FAIR across users: do not let one user end up with only the least-liked/lowest-rated tasks just because they haven't rated them before, and try to balance total estimated workload (sum of estimatedDurationMinutes) evenly across users over the week.
4. Balance the daily workload across the week: if a day has too many tasks/too much estimated duration, move some of its tasks to a lighter nearby day within the given week. If a day is empty or very light, pull some tasks forward from a heavier nearby day. Only move due dates within the provided week (between weekStart and weekEnd, inclusive).
5. NEVER schedule the same chore twice on the same day. Before proposing a "reschedule" action, look through the whole "upcomingTasks" list for any OTHER task with the same "chore" name and make sure none of them already has (or will end up with, after your other actions) that exact "dueDate". If every day within the week already has a conflicting occurrence of that chore, leave that task's due date unchanged instead of creating a duplicate.

This data is ONLY for this one household (id: ${payload.household.id}) — do not consider or reference any other household. Today is ${payload.household.today}. Only the upcoming week (${payload.household.weekStart} to ${payload.household.weekEnd}, inclusive) is in scope.

Household data (JSON):
${JSON.stringify(payload, null, 2)}

The only valid "userId" values for this household are: ${userIdList}.
The only valid "assignmentId" values for this week are: ${assignmentIdList}.

Return a JSON object with an "actions" array. Each action is either:
- { "type": "assign", "assignmentId": "<id from upcomingTasks>", "userId": "<id from users>", "reason": "..." }
- { "type": "reschedule", "assignmentId": "<id from upcomingTasks>", "newDueDate": "YYYY-MM-DD", "reason": "..." }

CRITICAL rules for "assignmentId" and "userId":
- Copy the id EXACTLY as it appears in the data above: the same characters, in the same order, nothing added or removed.
- Never append notes, names, commentary, punctuation or explanations to an id (e.g. do NOT write something like "<uuid> Tammy's ID?" — the value must be ONLY the raw uuid string, nothing else).
- Never invent, guess, abbreviate or partially type an id. If you are not fully certain of an id, do not produce an action referencing it.
- "userId" must be one of the ids listed under "users" (or null to unassign). "assignmentId" must be one of the ids listed under "upcomingTasks".

Only include actions that actually change something (skip assignments that are already optimal). It is fine to return an empty actions array if the schedule is already optimal.

Note: any "reschedule" action that would result in the same chore appearing twice on the same day is invalid and will be rejected and skipped when applied, so it is in your interest to avoid proposing one in the first place.`;
}

export async function getScheduleOptimizationActions(
  payload: HouseholdOptimizationPayload
): Promise<ScheduleAction[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(payload) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: buildResponseSchema(payload),
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API request failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini API returned no content");
  }

  let parsed: { actions?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini API returned invalid JSON: ${text}`);
  }

  if (!Array.isArray(parsed.actions)) {
    throw new Error("Gemini API response is missing an 'actions' array");
  }

  return parsed.actions as ScheduleAction[];
}
