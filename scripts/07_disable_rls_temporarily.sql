-- Temporary RLS disable for lineup submission testing
-- Run this in Supabase SQL Editor to fix the immediate submission issue
-- This is a TEMPORARY fix for development - in production we need proper service role

-- Disable RLS on lineups and lineup_players temporarily for testing
ALTER TABLE public.lineups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineup_players DISABLE ROW LEVEL SECURITY;

-- Verify current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('lineups', 'lineup_players', 'users', 'rooms', 'room_members');

-- Optional: Re-enable specific tables that should keep RLS
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- We can enable RLS later after setting up proper service role authentication