-- Fix fixtures table unique constraint
-- Run this in Supabase SQL Editor

-- Add unique constraint for fixtures to prevent duplicates
-- This allows UPSERT operations to work properly
ALTER TABLE public.fixtures 
ADD CONSTRAINT unique_fixture_per_gameweek 
UNIQUE (gameweek, home_team_id, away_team_id);

-- Create additional index for better performance on fixture queries
CREATE INDEX IF NOT EXISTS idx_fixtures_teams ON public.fixtures(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff ON public.fixtures(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_fixtures_finished ON public.fixtures(finished);

-- Optional: Clean up any existing duplicate fixtures before adding constraint
-- Uncomment if needed:
-- WITH numbered_fixtures AS (
--   SELECT id, 
--          ROW_NUMBER() OVER (PARTITION BY gameweek, home_team_id, away_team_id ORDER BY created_at) as rn
--   FROM public.fixtures
-- )
-- DELETE FROM public.fixtures 
-- WHERE id IN (
--   SELECT id FROM numbered_fixtures WHERE rn > 1
-- );