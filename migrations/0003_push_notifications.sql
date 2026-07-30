-- Migration: Add timezone to users and create push_subscriptions table.
-- Generated: 2026-07-31 00:50

-- Up Migration
ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'UTC';

CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, subscription_json)
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Apply Row Level Security Policies
CREATE POLICY manage_own_push_subscriptions ON push_subscriptions
    USING (user_id = current_user_id());
