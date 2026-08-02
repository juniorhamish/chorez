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

const DEFAULT_MODEL = "gemini-3-flash-preview";

const RESPONSE_SCHEMA = {
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
            description: "The id of the chore assignment this action applies to. Must be one of the ids provided in upcomingTasks.",
          },
          userId: {
            type: "STRING",
            nullable: true,
            description: "Required for 'assign' actions: the id of the user to assign the task to. Must be one of the ids provided in users.",
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

function buildPrompt(payload: HouseholdOptimizationPayload): string {
  return `You are optimising the weekly household chore schedule for a single household in the "Chorez" app.

Apply ALL of the following rules, in priority order:
1. Assign tasks to users based on their previous ratings of similar tasks/rooms. Prefer giving a user tasks they have rated highly in the past (higher "averageRating" = they enjoyed/preferred it).
2. Assign tasks based on room preferences: a user's "favoriteRooms" should be prioritised for that user over rooms they haven't favourited.
3. Keep the assignments FAIR across users: do not let one user end up with only the least-liked/lowest-rated tasks just because they haven't rated them before, and try to balance total estimated workload (sum of estimatedDurationMinutes) evenly across users over the week.
4. Balance the daily workload across the week: if a day has too many tasks/too much estimated duration, move some of its tasks to a lighter nearby day within the given week. If a day is empty or very light, pull some tasks forward from a heavier nearby day. Only move due dates within the provided week (between weekStart and weekEnd, inclusive).

This data is ONLY for this one household (id: ${payload.household.id}) — do not consider or reference any other household. Today is ${payload.household.today}. Only the upcoming week (${payload.household.weekStart} to ${payload.household.weekEnd}, inclusive) is in scope.

Household data (JSON):
${JSON.stringify(payload, null, 2)}

Return a JSON object with an "actions" array. Each action is either:
- { "type": "assign", "assignmentId": "<id from upcomingTasks>", "userId": "<id from users>", "reason": "..." }
- { "type": "reschedule", "assignmentId": "<id from upcomingTasks>", "newDueDate": "YYYY-MM-DD", "reason": "..." }

Only reference assignmentId values from upcomingTasks and userId values from users. Do not invent ids. Only include actions that actually change something (skip assignments that are already optimal). It is fine to return an empty actions array if the schedule is already optimal.`;
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
        responseSchema: RESPONSE_SCHEMA,
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
