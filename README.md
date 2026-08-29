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

## Help Button (Report an Issue on GitHub)

The Help (life-buoy) icon in the dashboard header opens a "Report an Issue" form. Submitting it calls the `submitHelpReport` server action (`lib/actions/feedback-actions.ts`), which raises the report as an issue on this project's GitHub repository — or adds it as a comment to an existing matching issue — **anonymously**, using a single shared service-account token. Users never need a GitHub account of their own.

The flow, end to end:

1. **Validation** — basic length checks (rejects empty/too-short or excessively long messages).
2. **Rate limiting** — at most 1 report per app user per rolling 2-minute window, tracked in the `feedback_reports` table (`migrations/0010_feedback_reports.sql`), so a single user can't spam the repository with issues.
3. **Duplicate search** — keywords from the report are used to search the repo's **open** issues via the GitHub REST search API (`lib/github.ts`), gathering a handful of candidates.
4. **AI screening** (`lib/feedback-screening.ts`, via the same Gemini API used by the schedule optimiser) — checks that the report is a genuine, coherent English sentence describing a real problem or suggestion (rejecting gibberish/spam/keyboard-mashing with a friendly error instead of submitting it), drafts a short issue title, and judges whether it's a semantic duplicate of one of the candidate issues found above.
5. **GitHub call** — if a duplicate is found, the report is posted as a comment on that issue; otherwise a brand-new issue is opened. Either way it's authored by the service account, never the reporting user.

`submitHelpReport` never throws: every expected failure above (not signed in, validation, rate limit, AI rejection) and any unexpected internal error are all returned as a plain `{ ok: false, error }` value rather than a thrown exception, and `useHelpReport` reads that directly. This follows Next.js's own guidance to model expected Server Action errors as return values instead of relying on `throw`/`try`/`catch` — errors thrown across the Server Action boundary are unreliable to surface as clean text in production (e.g. they can end up rendered as a raw, minified React error) instead of the intended friendly message.

### Configuration

```env
# Personal access token for a dedicated GitHub service account, with
# read/write access to Issues on GITHUB_REPO.
GITHUB_TOKEN=<personal access token>
GITHUB_REPO=juniorhamish/chorez
```

To set this up:

1. Create (or designate) a GitHub account to act as the service account — it doesn't need to be a human's personal account.
2. Generate a personal access token for that account (a fine-grained token scoped to just this repository with "Issues: Read and write" permission is sufficient; a classic token needs the `repo` scope).
3. Set `GITHUB_TOKEN` to that token and `GITHUB_REPO` to the `owner/repo` of the repository issues should be raised in.

`GEMINI_API_KEY` (see above) is also required, since the screening step reuses the existing Gemini integration.

## Preview Deployments & Database Branching

Every pull request against this repo gets its own isolated preview: a Vercel Preview Deployment wired up to a Neon Postgres branch that's a copy-on-write clone of production. This means a reviewer can log in to the preview with their real chorez account and see their real households/chores, but any schema changes or test data written while reviewing the PR live only on that branch's deltas — production is never touched, and the branch is deleted once the PR closes.

### One-time setup (dashboard, human-only)

This is performed once by someone with Vercel/Neon account access, and is **not** part of the repo's code:

1. In the Vercel project's dashboard, go to **Storage → Marketplace → Neon**.
2. Choose the **Neon-Managed (Connectable Account)** integration (not "Vercel-Managed", which would provision a brand-new Neon org) and link it to this project's existing Neon project.
3. Enable **Preview Branching** and **Automatically delete obsolete branches** for the connected Vercel project.

Once installed, Neon automatically creates a copy-on-write branch for every Vercel preview deployment and injects `DATABASE_URL`/`DATABASE_URL_UNPOOLED` into that deployment's environment — no webhook code required in this repo.

### Per-PR lifecycle

1. **PR opened/updated** → Vercel builds a Preview Deployment; Neon creates (or reuses) a preview branch cloned from production.
2. **Build time** → `vercel.json`'s `buildCommand` runs `npm run db:migrate` (`scripts/run-migrations.ts`) before `next build`. This applies any `migrations/*.sql` files not yet recorded in the `schema_migrations` table on that branch — since the branch is a copy-on-write clone, it already has production's ledger rows, so only migrations added by the PR itself actually execute.
3. **GitHub Actions safety net** (`.github/workflows/pr-db-check.yml`) independently creates a short-lived Neon branch, runs the same migration runner against it, and reports pass/fail as a PR check — so a broken migration is caught even if nobody opens the preview URL.
4. **PR closed (merged or not)** → the Neon integration automatically deletes the preview branch (and the CI workflow always deletes its own throwaway branch, even on failure), discarding any data or schema changes made during review. Closing the PR — whether merged or simply closed — additionally triggers `.github/workflows/vercel-preview-cleanup.yml`, which explicitly deletes the Vercel preview deployment(s) built for that PR's branch via the Vercel API (Vercel's own deployment retention would otherwise leave it around for a while).

### Local Database Sync

To reset your local development database branch to match the production state (data and schema) while preserving your connection string and re-applying any unmerged local migrations, run:

```bash
npm run db:sync
```

This script:
1. Identifies the project and branch from your `.neon` file (or `NEON_PROJECT_ID`/`NEON_BRANCH` environment variables).
2. Uses the Neon API to perform a "Reset from parent", overwriting the dev branch with production's state.
3. Automatically runs `npm run db:migrate` to re-apply any migration files in your local branch that haven't been merged to production yet.

Requires `NEON_API_KEY` to be set in your environment or `.env.local`.

### Configuration

```env
# NEON_API_KEY is only needed for CI (pr-db-check.yml); Vercel deployments get
# DATABASE_URL/DATABASE_URL_UNPOOLED injected automatically by the Neon integration above.
NEON_API_KEY=<Neon personal or org API key, set as a GitHub Actions repo secret>

# Only needed for CI (vercel-preview-cleanup.yml), to delete a PR's preview
# deployment when the PR is closed (merged or not). Set as GitHub Actions repo secrets.
VERCEL_TOKEN=<Vercel personal or team access token, from https://vercel.com/account/tokens>
VERCEL_PROJECT_ID=<this project's Vercel project ID, from Project Settings → General>
VERCEL_ORG_ID=<your Vercel team/org ID; omit the secret entirely if the project is under a personal account>
```

## Automated Issue Triage (Junie GitHub Action)

`.github/workflows/junie-issue-to-pr.yml` runs the official [Junie GitHub Action](https://github.com/JetBrains/junie-github-action) every time an issue is opened or edited (excluding issues opened/edited by bots, to avoid loops). Junie reads the issue's title, description, and all existing comments, then:

- If the issue has enough information to act on, it follows this repo's `AGENTS.md` codebase map (including which `.junie/skills/*` skill or `.junie/agents/*` sub-agent to reach for) and opens a pull request implementing the fix or feature, with `Fixes #<issue number>` in its description so the issue auto-closes on merge.
- If the issue is missing key details (e.g. reproduction steps, expected behavior, acceptance criteria), Junie posts a comment on the issue asking clarifying questions instead of opening a PR.

If the change requires a database migration, this workflow only ever adds the new `migrations/*.sql` file(s) to the PR — it never applies them to the persistent `dev` Neon branch. Schema changes are applied exclusively as part of the PR's own Vercel Preview Deployment build (see "Preview Deployments & Database Branching" above), which already runs the migration runner against that preview's dedicated, disposable Neon branch. The `db-agent` sub-agent (`.junie/agents/db-agent.md`) enforces this restriction whenever it's invoked from this workflow.

Once a PR is opened, a second job in the same workflow polls the GitHub Deployments API for the PR branch's Vercel preview deployment (see "Preview Deployments & Database Branching" below) and posts a comment on the original issue linking both the PR and its live preview URL as soon as the deployment succeeds.

A third job (`approve-db-migration-check`) auto-approves the resulting run of `pr-db-check.yml` ("PR Database Migration Check") for Junie's PR, in case GitHub requires manual maintainer approval before a workflow run triggered this way is allowed to execute — so the migration safety-net check still runs automatically instead of sitting stuck until a human clicks "Approve and run".

### Security

Because this job runs with `contents: write`, `pull-requests: write`, and `issues: write` permissions but is triggered by an issue's own (attacker-controllable, on a public repo) title/description/comments, the following safeguards keep a malicious or over-eager run from turning into arbitrary write access, a prompt-injection attack, or an unrelated/scope-creeping PR:

- **Prompt hardening** — the prompt explicitly tells Junie to treat the issue's title/description/comments as untrusted data describing a requested change, never as instructions that can override the prompt itself, reveal secrets/tokens, touch CI/workflow files or auth/RLS code, run arbitrary commands, or reach out to external services — and to skip opening a PR (posting an explanatory comment instead) if the issue doesn't hold up as a legitimate request once any such embedded instructions are stripped out.
- **Scope discipline** — the prompt also requires every changed file in the PR to trace back directly to the issue being resolved, explicitly forbidding speculative or "while I'm in here" changes (e.g. bumping the Gemini model version, unrelated dependency bumps, or reformatting untouched code), and requires Junie to review its own diff file-by-file and revert anything that doesn't address the issue before opening the PR.

### Configuration

```env
# Required. JetBrains Junie API key, generated at https://junie.jetbrains.com/cli.
# Set as a GitHub Actions repo secret.
JUNIE_API_KEY=<Junie API key>
```

No other secrets are required: the workflow uses the default `GITHUB_TOKEN` to open PRs, comment on issues, and read deployment statuses. Note that PRs opened using the default `GITHUB_TOKEN` don't themselves trigger other `pull_request`-scoped workflows (e.g. `pr-db-check.yml`) due to GitHub Actions' recursive-workflow prevention — the Vercel/Neon preview pipeline still runs regardless, since it's driven by Vercel's own GitHub integration rather than a workflow.

## Error Boundaries

`app/error.tsx` and `app/global-error.tsx` are React error boundaries (Next.js's `error.js`/`global-error.js` file conventions) that catch any uncaught rendering exception the app doesn't already handle. Without them, an unexpected error in production has nowhere to be caught and Next.js falls back to its raw, unstyled crash screen (which can show up as a cryptic "Minified React error" message); with them, the user instead sees a friendly "Something went wrong" screen with a **Try again** button.
