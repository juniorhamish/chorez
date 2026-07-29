-- Migration: Initial schema to support household, users, rooms, chores, assignments, and favorites.
-- Generated: 2026-07-29 01:12

-- Up Migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Households: The primary isolation unit
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Users: Application users belonging to a household
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_label TEXT, -- Short string for avatar display (e.g., "A", "J")
    color_theme TEXT,  -- Tailwind classes for user coloring
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Rooms: Categories for chores
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon_name TEXT, -- Lucide icon name (e.g., "UtensilsCrossed", "Bath")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Chores: Templates for tasks that need to be done
CREATE TABLE chores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes >= 0),
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'on-demand')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Chore Assignments: Specific instances of chores assigned to users
CREATE TABLE chore_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chore_id UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
    completed_at TIMESTAMP WITH TIME ZONE,
    actual_duration_minutes INTEGER CHECK (actual_duration_minutes >= 0),
    effort_rating INTEGER CHECK (effort_rating BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT status_completed_check CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed' AND completed_at IS NULL)
    )
);

-- 6. User Favorites: Track favorited rooms and chores per user
CREATE TABLE user_favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('room', 'chore')),
    target_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, target_type, target_id)
);

-- Indexes for performance
CREATE INDEX idx_users_household_id ON users(household_id);
CREATE INDEX idx_rooms_household_id ON rooms(household_id);
CREATE INDEX idx_chores_household_id ON chores(household_id);
CREATE INDEX idx_chores_room_id ON chores(room_id);
CREATE INDEX idx_chore_assignments_household_id ON chore_assignments(household_id);
CREATE INDEX idx_chore_assignments_due_date ON chore_assignments(due_date);
CREATE INDEX idx_chore_assignments_assigned_user_id ON chore_assignments(assigned_user_id);

-- Enable RLS
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION current_household_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.current_household_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Apply Row Level Security Policies
CREATE POLICY household_isolation_policy ON households
    USING (id = current_household_id());

CREATE POLICY user_isolation_policy ON users
    USING (household_id = current_household_id());

CREATE POLICY room_isolation_policy ON rooms
    USING (household_id = current_household_id());

CREATE POLICY chore_isolation_policy ON chores
    USING (household_id = current_household_id());

CREATE POLICY assignment_isolation_policy ON chore_assignments
    USING (household_id = current_household_id());

CREATE POLICY favorites_isolation_policy ON user_favorites
    USING (user_id = current_user_id());
