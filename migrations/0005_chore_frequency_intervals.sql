-- Migration: Extend chore frequency options with every-x-days, every-x-weeks, and yearly.
-- Generated: 2026-08-01 23:36

-- Up Migration
ALTER TABLE chores DROP CONSTRAINT chores_frequency_check;

ALTER TABLE chores ADD CONSTRAINT chores_frequency_check
    CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly', 'every-x-days', 'every-x-weeks', 'on-demand'));

ALTER TABLE chores ADD COLUMN frequency_interval INTEGER CHECK (frequency_interval IS NULL OR frequency_interval > 0);

ALTER TABLE chores ADD CONSTRAINT chores_frequency_interval_required_check
    CHECK (
        (frequency IN ('every-x-days', 'every-x-weeks') AND frequency_interval IS NOT NULL) OR
        (frequency NOT IN ('every-x-days', 'every-x-weeks') AND frequency_interval IS NULL)
    );
