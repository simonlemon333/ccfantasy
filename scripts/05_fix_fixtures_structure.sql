-- Fix fixtures table structure and data
-- Run this in Supabase SQL Editor

-- Add missing columns to fixtures table if they don't exist
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS fpl_id integer;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS home_team_fpl_id integer;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS away_team_fpl_id integer;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS minutes_played integer DEFAULT 0;

-- Create index on fpl_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_fixtures_fpl_id ON fixtures(fpl_id);

-- Fix inconsistent data - if finished=true but scores are null, set finished=false
UPDATE fixtures 
SET finished = false, updated_at = now()
WHERE finished = true 
  AND (home_score IS NULL OR away_score IS NULL);

-- Fix inconsistent data - if both scores exist but finished=false and minutes > 90, set finished=true
UPDATE fixtures 
SET finished = true, updated_at = now()
WHERE finished = false 
  AND home_score IS NOT NULL 
  AND away_score IS NOT NULL 
  AND minutes_played >= 90;

-- Show current fixtures status
SELECT 
  gameweek,
  COUNT(*) as total_fixtures,
  COUNT(CASE WHEN finished THEN 1 END) as finished_fixtures,
  COUNT(CASE WHEN home_score IS NOT NULL AND away_score IS NOT NULL THEN 1 END) as fixtures_with_scores,
  COUNT(CASE WHEN finished AND (home_score IS NULL OR away_score IS NULL) THEN 1 END) as inconsistent_fixtures
FROM fixtures 
GROUP BY gameweek 
ORDER BY gameweek DESC;