-- Migration: Support multiple households per user and invitations.
-- Generated: 2026-07-30 23:30

-- 1. Create household_members join table
CREATE TABLE household_members (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, household_id)
);

-- 2. Add active_household_id to users
ALTER TABLE users ADD COLUMN active_household_id UUID REFERENCES households(id) ON DELETE SET NULL;

-- 3. Migrate existing data
INSERT INTO household_members (user_id, household_id, role)
SELECT id, household_id, role FROM users;

UPDATE users SET active_household_id = household_id;

-- 4. Drop dependent policies and column
DROP POLICY IF EXISTS user_isolation_policy ON users;
DROP POLICY IF EXISTS household_isolation_policy ON households;
DROP POLICY IF EXISTS room_isolation_policy ON rooms;
DROP POLICY IF EXISTS chore_isolation_policy ON chores;
DROP POLICY IF EXISTS assignment_isolation_policy ON chore_assignments;

ALTER TABLE users DROP COLUMN household_id;

-- 5. Create household_invitations table
CREATE TABLE household_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    inviter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Update RLS policies
-- Helper functions for RLS already exist: current_household_id() and current_user_id()

CREATE POLICY household_isolation_policy ON households
    USING (id IN (SELECT household_id FROM household_members WHERE user_id = current_user_id()));

CREATE POLICY user_isolation_policy ON users
    USING (id = current_user_id() OR id IN (
        SELECT user_id FROM household_members 
        WHERE household_id = (SELECT active_household_id FROM users WHERE id = current_user_id())
    ));

CREATE POLICY room_isolation_policy ON rooms
    USING (household_id = (SELECT active_household_id FROM users WHERE id = current_user_id()));

CREATE POLICY chore_isolation_policy ON chores
    USING (household_id = (SELECT active_household_id FROM users WHERE id = current_user_id()));

CREATE POLICY assignment_isolation_policy ON chore_assignments
    USING (household_id = (SELECT active_household_id FROM users WHERE id = current_user_id()));

-- Indexes for performance
CREATE INDEX idx_household_members_user_id ON household_members(user_id);
CREATE INDEX idx_household_members_household_id ON household_members(household_id);
CREATE INDEX idx_household_invitations_invitee_email ON household_invitations(invitee_email);
CREATE INDEX idx_household_invitations_household_id ON household_invitations(household_id);
