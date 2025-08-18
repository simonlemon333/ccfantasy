-- Add team names to fixtures table for better readability
-- Run this in Supabase SQL Editor

-- Add team name columns to fixtures table
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS home_team_name text;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS away_team_name text;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS home_team_short_name text;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS away_team_short_name text;

-- Update existing fixtures with team names by joining with teams table
UPDATE fixtures 
SET 
    home_team_name = ht.name,
    home_team_short_name = ht.short_name
FROM teams ht 
WHERE fixtures.home_team_id = ht.id;

UPDATE fixtures 
SET 
    away_team_name = at.name,
    away_team_short_name = at.short_name
FROM teams at 
WHERE fixtures.away_team_id = at.id;

-- Create a view for easier fixture reading
CREATE OR REPLACE VIEW fixtures_readable AS
SELECT 
    f.id,
    f.gameweek,
    COALESCE(f.home_team_name, ht.name, f.home_team_id) as home_team,
    COALESCE(f.away_team_name, at.name, f.away_team_id) as away_team,
    COALESCE(f.home_team_short_name, ht.short_name) as home_short,
    COALESCE(f.away_team_short_name, at.short_name) as away_short,
    f.home_score,
    f.away_score,
    f.finished,
    f.minutes_played,
    f.kickoff_time,
    f.created_at,
    f.updated_at
FROM fixtures f
LEFT JOIN teams ht ON f.home_team_id = ht.id
LEFT JOIN teams at ON f.away_team_id = at.id
ORDER BY f.kickoff_time DESC;

-- Show current fixtures with team names
SELECT 
    gameweek,
    home_team,
    away_team,
    CASE 
        WHEN home_score IS NOT NULL AND away_score IS NOT NULL 
        THEN CONCAT(home_score, '-', away_score)
        ELSE 'vs'
    END as score,
    CASE 
        WHEN finished THEN '已结束'
        WHEN home_score IS NOT NULL OR away_score IS NOT NULL THEN '进行中'
        ELSE '未开始'
    END as status,
    kickoff_time::date as match_date
FROM fixtures_readable
ORDER BY kickoff_time DESC
LIMIT 10;