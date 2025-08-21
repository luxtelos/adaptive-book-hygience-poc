-- Disable RLS on qbo_tokens table (security handled at application layer via Clerk)
ALTER TABLE public.qbo_tokens DISABLE ROW LEVEL SECURITY;