-- Add data_source field to fixtures table
-- Run this in Supabase SQL Editor

-- Add data_source column to track where data comes from
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'FPL';

-- Update existing fixtures to mark them as FPL source
UPDATE fixtures SET data_source = 'FPL' WHERE data_source IS NULL;

-- Show current fixtures with data source
SELECT 
    gameweek,
    home_team_id,
    away_team_id,
    finished,
    data_source,
    created_at
FROM fixtures 
ORDER BY kickoff_time DESC 
LIMIT 10;