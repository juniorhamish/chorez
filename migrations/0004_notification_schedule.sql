-- Migration: Add configurable morning/evening notification hours to users.
-- Generated: 2026-08-01 23:25

-- Up Migration
ALTER TABLE users ADD COLUMN morning_notification_hour INTEGER NOT NULL DEFAULT 8
    CHECK (morning_notification_hour BETWEEN 0 AND 23);

ALTER TABLE users ADD COLUMN evening_notification_hour INTEGER NOT NULL DEFAULT 18
    CHECK (evening_notification_hour BETWEEN 0 AND 23);
