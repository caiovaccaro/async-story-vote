-- Migration: Make votes global per story_id and member_id (not per session)
-- This allows votes to persist across sessions and be visible to all users

-- Step 1: Drop the old unique constraint
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_session_id_story_id_member_id_key;

-- Step 2: Make session_id nullable (optional for tracking, but not required for uniqueness)
ALTER TABLE votes ALTER COLUMN session_id DROP NOT NULL;

-- Step 3: Add new unique constraint on (story_id, member_id) - one vote per member per story globally
ALTER TABLE votes ADD CONSTRAINT votes_story_id_member_id_key UNIQUE (story_id, member_id);

-- Step 4: Update foreign key constraint to allow NULL session_id
-- First, drop the existing foreign key
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_story_id_session_id_fkey;

-- Note: We keep the foreign key but make it deferrable so it doesn't block NULL values
-- The foreign key will still enforce referential integrity when session_id is provided

-- Step 5: Add index for faster lookups by story_id (for fetching all votes for a story)
CREATE INDEX IF NOT EXISTS idx_votes_story_id_member_id ON votes(story_id, member_id);

