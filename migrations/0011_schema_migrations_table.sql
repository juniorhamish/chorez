-- Migration: Track which migrations have been applied to a given branch, so the migration runner
-- (scripts/run-migrations.ts) can apply only pending migrations on every Vercel build (prod and preview).
-- Generated: 2026-08-18 20:31

-- Up Migration
CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- No RLS: internal tooling table, never queried by app code or exposed to household-scoped roles.
