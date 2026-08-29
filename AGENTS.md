<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Chorez — Codebase Map for Agents

Read this before exploring the tree yourself — it should save you from re-deriving the architecture from scratch. It is deliberately concise; follow the pointers below into the actual source rather than expecting exhaustive detail here.

## What this is

Chorez is a mobile-first household chore tracker: a Next.js 16 (App Router) app backed by Neon Postgres, authenticated with Auth0, with a Gemini-powered weekly schedule optimiser. See `README.md` for feature descriptions, Auth0 setup steps, and the Gemini cron endpoint's request/response shape — don't duplicate that here, read it directly when relevant.

## Where things live

- `app/` — routes and UI (App Router).
  - `app/dashboard/page.tsx` — the only real server entry point; fetches everything the client needs in one `Promise.all` from `lib/actions/*` and hands it to `dashboard-client.tsx` as `initial*` props.
  - `app/dashboard/dashboard-client.tsx` — the single large client component orchestrating the whole dashboard. It delegates state to hooks in `lib/dashboard/hooks/*` (one hook per concern: task modals, add-task form, add-room form, household switcher, invites, manage-household, push notifications, schedule optimisation, stopwatch, view preferences).
  - `app/dashboard/components/` — presentational pieces (`DashboardHeader`, `WeekStrip`, `RoomFilterBar`, `TaskList`, `TaskCard`, `RelatedTasksStack`) plus `components/modals/*` for every dialog/drawer (add/edit task, add/edit room, complete task, invite member, manage household, profile, AI optimisation summary, delete confirmation).
  - `app/api/cron/*` — cron-triggered routes: `optimize-schedule` (Gemini rebalancing, see below), `reschedule` / `reschedule-incomplete` (day-to-day recurrence bookkeeping). All gated by an optional `CRON_SECRET` bearer token.
  - `app/api/push/subscribe`, `app/api/notifications/trigger` — Web Push subscription + delivery.
  - `proxy.ts` — Next 16's replacement for `middleware.ts`; mounts Auth0's `/auth/*` routes and redirects unauthenticated requests to `/dashboard`.
- `lib/actions/*` — all Server Actions (`"use server"`), the only layer allowed to touch `sql` from `lib/db.ts`. `chore-actions.ts` (chores/rooms/favorites/tasks), `user-actions.ts` (auth/household membership/invites), `schedule-optimization-actions.ts` (Gemini run history + undo).
- `lib/scheduling.ts` — pure date/recurrence math (next due date, rolling-horizon generation for sub-weekly recurring chores). Fully unit-tested (`scheduling.test.ts`); prefer extending this file over reimplementing date logic inline.
- `lib/gemini.ts` — thin `fetch`-based wrapper around the Gemini REST API (no SDK dependency, deliberately). Builds the prompt + structured-output JSON schema for the weekly optimiser; used by `lib/schedule-optimization.ts`.
- `lib/dashboard/` — `types.ts` (shared dashboard domain types) and `hooks/` (see above); each hook has a co-located `*.test.ts`.
- `lib/db.ts` — the single Neon `sql` client (`@neondatabase/serverless`), created from `DATABASE_URL`. Always mock this in tests (`vi.mock("@/lib/db", ...)`) — never hit a real database from a unit test.
- `migrations/*.sql` — sequentially numbered (`0001_...` → `0011_...`), forward-only SQL migrations; there is no ORM. `scripts/run-migrations.ts` applies pending files to any branch (tracked via the `schema_migrations` table) and runs on every Vercel build and PR check — see the README's "Preview Deployments & Database Branching" section for the full per-PR lifecycle, read it directly rather than duplicating it here. Follow `db-agent`'s conventions (below) for new migration files, including RLS policies.

## Domain model (see `migrations/0001_initial_schema.sql` for full DDL)

`households` → `users` (role `admin`/`member`) → `rooms` → `chores` (a recurring template: `frequency` + `frequency_interval`, optionally `private_to_user_id`) → `chore_assignments` (a concrete due-dated instance with `status`/`effort_rating`/`actual_duration_minutes`). `user_favorites` tracks favourited rooms/chores. Multi-household support (`0002`) means a user has one `active_household_id` but can belong to several. Row-Level Security is enforced via `current_household_id()`/`current_user_id()` Postgres session settings on every table — new tables must follow the same pattern.

## AI schedule optimisation

`GET`/`POST /api/cron/optimize-schedule` → `lib/schedule-optimization.ts` gathers per-household context (members, favourite rooms, historical ratings, upcoming week's assignments) and sends **one Gemini request per household** (`lib/gemini.ts`) constrained to a structured-output schema so it can only reference real assignment/user ids. Results are recorded (`schedule-optimization-actions.ts` / `migrations/0008_*.sql`) so the dashboard can show an undo-able summary (`AiOptimizationSummaryModal.tsx`). Full behavioural rules and response shape are documented in `README.md`.

## Testing & tooling

- Tests: Vitest + Testing Library + jsdom (`vitest.config.mts`, `vitest.setup.ts`). Run with `npm test` (or `npm run test:watch`). Co-located `*.test.ts`/`*.test.tsx` files sit next to the code they cover — follow that layout for new tests, and check for an existing test file before writing a new one.
- Lint: `npm run lint` (ESLint flat config, `eslint-config-next`).
- Build/dev: `npm run build` / `npm run dev`.
- Path alias: `@/*` → project root (see `tsconfig.json`).
- Env vars: copy `.env.local.example` → `.env.local` (Auth0, `GEMINI_API_KEY`, optional `CRON_SECRET`). Neon project linkage lives in `.neon` (git-ignored, managed by the Neon CLI).

## Which skill or agent to reach for

| Task type | Use |
| --- | --- |
| Anything touching `migrations/*.sql`, schema design, RLS policies, or Neon branches/connections | Delegate to the **`db-agent`** sub-agent (it owns the migrate → branch-validate → apply pipeline); otherwise read the **`neon`** and **`neon-postgres`** skills yourself first |
| New/changed UI components, layouts, or visual polish in `app/` | Delegate to the **`ux-designer`** sub-agent, or use the **`ui-generator`** skill directly for small tweaks; consult **`frontend-design`** for aesthetic/typography decisions on anything user-facing |
| Component API design (props explosion, compound components, context) | **`vercel-composition-patterns`** skill |
| React/Next.js performance work (waterfalls, bundle size, re-renders) | **`vercel-react-best-practices`** skill |
| Writing or reasoning about tests, mocking `lib/db.ts`, coverage | **`vitest`** skill; for a strict test-first workflow use the **`tdd`** skill |
| Browser-driven debugging/automation (e.g. reproducing a UI bug live) | **`chrome-devtools-cli`** skill |
| Checking for and applying npm dependency updates, then verifying build/lint/test and a live logged-in browser check | **`dependency-update`** skill |
| Anything Neon-specific not covered above (branching, pooling, autoscaling) | **`neon`** (routing skill) → **`neon-postgres`** |
| Discovering whether a skill exists for a novel task | **`find-skills`** skill |
| Setting up/finishing `.junie/demo.md` or a VM `Dockerfile` | **`demo-setup`** skill |
| Picking an open GitHub issue to analyse, clarify, plan, and turn into a PR | **`issue-to-pr`** skill (interactive, human-approved — see README's "Issue Triage" section) |

Past non-trivial implementation plans (for context on prior decisions, not necessarily current state) live under `.junie/plans/`.
