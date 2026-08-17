-- Migration: Record user-submitted "Report an issue" feedback (as GitHub issues), for audit trail and per-user rate limiting.
-- Generated: 2026-08-17 17:41

-- Up Migration
CREATE TABLE feedback_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    github_issue_number INTEGER NOT NULL,
    github_issue_action TEXT NOT NULL CHECK (github_issue_action IN ('created', 'commented')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_feedback_reports_user_id_created_at ON feedback_reports(user_id, created_at);

-- Enable RLS
ALTER TABLE feedback_reports ENABLE ROW LEVEL SECURITY;

-- Apply Row Level Security Policies
CREATE POLICY manage_own_feedback_reports ON feedback_reports
    USING (user_id = current_user_id());
