-- Migration: Allow a chore to be marked private to a single user, so it can only ever be assigned to (and visible to) that user.
-- Generated: 2026-08-08 20:04

-- Up Migration
ALTER TABLE chores ADD COLUMN private_to_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_chores_private_to_user_id ON chores(private_to_user_id);
