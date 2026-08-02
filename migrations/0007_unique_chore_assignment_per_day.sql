-- Migration: Deduplicate chore_assignments by (chore_id, due_date) and enforce uniqueness.
-- Generated: 2026-08-02 02:38

-- Up Migration

-- Remove duplicate assignments for the same chore on the same day, keeping a
-- completed row if one exists in the group, otherwise the earliest created row.
WITH ranked_assignments AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY chore_id, due_date
            ORDER BY (status = 'completed') DESC, created_at ASC
        ) AS row_number
    FROM chore_assignments
)
DELETE FROM chore_assignments
WHERE id IN (
    SELECT id FROM ranked_assignments WHERE row_number > 1
);

ALTER TABLE chore_assignments ADD CONSTRAINT chore_assignments_chore_due_date_unique
    UNIQUE (chore_id, due_date);
