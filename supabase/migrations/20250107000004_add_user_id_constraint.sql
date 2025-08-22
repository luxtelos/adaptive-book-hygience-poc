-- Migration: Add unique constraint to user_id in user_assessments
-- Description: Ensures each user can only have one assessment record
-- Created: 2025-01-08

-- Add unique constraint on user_id
ALTER TABLE user_assessments 
ADD CONSTRAINT user_assessments_user_id_unique UNIQUE (user_id);

-- Update any existing records that might have missing user_id
-- This is a safety measure for legacy data
UPDATE user_assessments 
SET user_id = CONCAT('legacy_', id::text) 
WHERE user_id IS NULL OR user_id = '';

-- Make user_id NOT NULL after cleanup
ALTER TABLE user_assessments 
ALTER COLUMN user_id SET NOT NULL;

-- Add comment for documentation
COMMENT ON CONSTRAINT user_assessments_user_id_unique ON user_assessments 
IS 'Ensures each Clerk user can only have one active assessment record';