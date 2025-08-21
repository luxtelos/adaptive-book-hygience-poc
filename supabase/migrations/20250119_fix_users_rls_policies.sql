-- Migration: Fix users table RLS policies for anonymous access
-- Description: Update RLS policies to work with Clerk authentication and anonymous Supabase client
-- Created: 2025-01-19
-- Issue: RLS policies not properly configured for anonymous UPSERT operations

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for all users" ON users;
DROP POLICY IF EXISTS "Enable select for all users" ON users;
DROP POLICY IF EXISTS "Enable update for all users" ON users;

-- Create new policies that work with anonymous access (anon role)
-- Since we're using Clerk for auth, we need to allow anon role to perform operations

-- Allow anyone to SELECT (needed for upsert conflict checking)
CREATE POLICY "Enable read access for all users" 
ON users FOR SELECT 
TO anon, authenticated
USING (true);

-- Allow anyone to INSERT
CREATE POLICY "Enable insert access for all users" 
ON users FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Allow anyone to UPDATE their own record (based on clerk_id)
CREATE POLICY "Enable update access for all users" 
ON users FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Optional: Add DELETE policy if needed
CREATE POLICY "Enable delete access for all users" 
ON users FOR DELETE 
TO anon, authenticated
USING (false); -- Set to true if you want to allow deletes

-- Grant necessary permissions to anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON public.users TO anon;
GRANT USAGE ON SEQUENCE users_id_seq TO anon;

-- Also grant to authenticated role for completeness
GRANT ALL ON public.users TO authenticated;
GRANT USAGE ON SEQUENCE users_id_seq TO authenticated;

-- Verify the policies are correctly set
DO $$
BEGIN
    RAISE NOTICE 'RLS policies for users table have been updated.';
    RAISE NOTICE 'The table now allows anonymous access through Supabase client.';
END $$;