-- Migration: Generic key/value table for global application configuration, seeded with the current app version.
-- Generated: 2026-08-18 22:30

-- Up Migration
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- No RLS: global application configuration, not household-scoped, never queried by household-scoped roles.

INSERT INTO app_settings (key, value) VALUES ('app_version', '1.0.0') ON CONFLICT (key) DO NOTHING;
