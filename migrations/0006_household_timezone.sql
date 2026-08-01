-- Migration: Add timezone to households table, defaulting existing ones to 'Europe/London'.
-- Generated: 2026-08-02 00:30

-- Up Migration
ALTER TABLE households ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Europe/London';
