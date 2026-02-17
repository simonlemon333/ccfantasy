-- Add fpl_id column to players table
-- This stores the FPL element ID for API lookups (element-summary endpoint)
ALTER TABLE players ADD COLUMN IF NOT EXISTS fpl_id integer;

-- Create an index for faster lookups by fpl_id
CREATE INDEX IF NOT EXISTS idx_players_fpl_id ON players (fpl_id) WHERE fpl_id IS NOT NULL;
