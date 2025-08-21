-- Migration: Fix users table RLS and column names
-- Description: Disable RLS on users table and fix column naming
-- Created: 2025-01-19
-- Issue: RLS was enabled but no policies were defined, causing 401 errors

-- First, check if the table exists and has the wrong column name
DO $$ 
BEGIN
    -- Check if clerk_user_id column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'clerk_user_id'
    ) THEN
        -- Rename column to match the application code
        ALTER TABLE users RENAME COLUMN clerk_user_id TO clerk_id;
    END IF;
    
    -- Add missing columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'profile_image_url'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_image_url TEXT;
    END IF;
END $$;

-- Disable Row Level Security on the users table
-- Since authentication is handled by Clerk, not Supabase Auth,
-- RLS should not be enabled on this table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Update the unique constraint to use the correct column name
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_clerk_user_id_key;
ALTER TABLE users ADD CONSTRAINT users_clerk_id_key UNIQUE (clerk_id);

-- Update indexes with correct column name
DROP INDEX IF EXISTS idx_users_clerk_user_id;
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- Update comments for documentation
COMMENT ON COLUMN users.clerk_id IS 'Unique ID from Clerk authentication';
COMMENT ON COLUMN users.profile_image_url IS 'User profile image URL from Clerk';

-- Grant necessary permissions for anonymous access (since Clerk handles auth)
-- This allows the application to perform CRUD operations
GRANT ALL ON users TO anon;
GRANT ALL ON users TO authenticated;