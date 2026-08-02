# Chorez - Household Chore Tracker

A clean, professional, and friendly mobile-first dashboard for managing household chores.

## Features

- **Weekly Calendar Slider**: Easily switch between days of the week.
- **Room Categories**: Filter tasks by room (Kitchen, Bathroom, etc.) and favorite your most-used categories.
- **Task List**: High-fidelity task cards with duration, assignment, and favorite toggling.
- **Task Completion Flow**: Interactive slide-up drawer for reporting actual time taken and rating the effort.
- **Modern Tech Stack**: Built with Next.js, Tailwind CSS, Framer Motion, and Lucide Icons.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

## Authentication (Auth0)

The "Log In" button is wired up using the [Auth0 Next.js SDK](https://github.com/auth0/nextjs-auth0) (`@auth0/nextjs-auth0`).

### 1. Create an Auth0 Application

In the [Auth0 Dashboard](https://manage.auth0.com), create a new Application of type **Regular Web Application** (not Single Page App / SPA or Native — the SDK performs the OAuth code exchange on the server, so it needs a confidential client with a client secret).

In that Application's **Settings**, configure:

- **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
- **Allowed Logout URLs**: `http://localhost:3000`
- **Allowed Web Origins**: `http://localhost:3000`

(Add your production URL equivalents too once deployed, e.g. `https://your-domain.com/auth/callback`.)

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the values from your Auth0 Application's settings page:

```bash
cp .env.local.example .env.local
```

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=<from Auth0 Application settings>
AUTH0_CLIENT_SECRET=<from Auth0 Application settings>
AUTH0_SECRET=<generate with `openssl rand -hex 32`>
APP_BASE_URL=http://localhost:3000
```

`.env.local` is already git-ignored, so secrets never get committed.

### 3. Run it

Start the dev server (`npm run dev`) and click **Log In** — you'll be redirected to Auth0's Universal Login page, then back to the app once authenticated. The button automatically switches to **Log Out** when a session is active.

## AI-Optimised Weekly Schedule (Google Gemini)

`GET`/`POST /api/cron/optimize-schedule` uses the Google Gemini API to rebalance the **upcoming week's** pending chore assignments for every household. It's meant to be triggered by a cron job **once per week**.

For each household, it packages up:

- The household's members.
- Each member's favourite rooms.
- Each member's historical average effort/satisfaction rating, broken down by room and by chore (from completed tasks).
- The pending chore assignments due in the next 7 days.

...and sends this as a **separate Gemini request per household** (so context, instructions, and results never mix across households), asking it to return a list of actions following these rules:

1. Prefer assigning a user tasks they've rated highly in the past.
2. Prefer assigning a user tasks in their favourite rooms.
3. Keep assignments fair — no one should be stuck with only unrated/low-rated tasks.
4. Rebalance due dates within the week to avoid overloaded or empty days.

Gemini can only respond with two action types, and any action referencing an unknown assignment or user is skipped rather than applied:

- `assign` — set the assignee on a specific chore assignment.
- `reschedule` — move a chore assignment's due date (must stay within the optimised week).

### Configuration

```env
GEMINI_API_KEY=<from https://aistudio.google.com/apikey>
# GEMINI_MODEL=gemini-2.0-flash   # optional override
# CRON_SECRET=<shared secret>      # optional, required by all /api/cron/* routes when set
```

### Query params

- `?dryRun=true` — compute and return the proposed actions without writing to the database (useful for testing).
- `?householdId=<uuid>` — only optimise a single household.

### Response shape

For each household, the response includes an `appliedActions` array describing exactly what was changed (or, with `?dryRun=true`, what *would* be changed):

```json
{
  "type": "reschedule",
  "assignmentId": "d20cea3b-c71a-4d57-aa53-37c9ac1a4d9e",
  "chore": "Hoover rug",
  "room": "Hall",
  "previousDueDate": "2026-08-02",
  "newDueDate": "2026-08-03",
  "reason": "Moving this task to Monday helps balance the heavy workload on Sunday across the week."
}
```

`assign` actions include `previousUserId`/`newUserId` instead of due dates. Actions Gemini proposed but that referenced an unknown/invalid id, user, or date are reported separately under `skippedActions` (with a `reason`) and are never applied.
