-- Migration: Track AI (Gemini) schedule-optimization runs per household, to power an undo action and a human-readable summary of changes.
-- Generated: 2026-08-04 00:31

-- Up Migration
CREATE TABLE schedule_optimization_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    tasks_considered INTEGER NOT NULL DEFAULT 0,
    applied_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    undone_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_schedule_optimization_runs_household_id ON schedule_optimization_runs(household_id);
CREATE INDEX idx_schedule_optimization_runs_created_at ON schedule_optimization_runs(created_at);

-- Enable RLS
ALTER TABLE schedule_optimization_runs ENABLE ROW LEVEL SECURITY;

-- Apply Row Level Security Policy (matching the household-scoped pattern used for chore_assignments etc. in migration 0002)
CREATE POLICY schedule_optimization_runs_isolation_policy ON schedule_optimization_runs
    USING (household_id = (SELECT active_household_id FROM users WHERE id = current_user_id()));
