-- Migration: Generic key/value table for global application configuration (not household-scoped).
-- Generated: 2026-08-18 20:55

-- Up Migration
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_settings (key, value) VALUES ('app_version', '1.0.0') ON CONFLICT (key) DO NOTHING;

-- No RLS: internal tooling table, never queried by app code or exposed to household-scoped roles.
