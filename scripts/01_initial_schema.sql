-- CCFantasy Database Schema
-- Run this in Supabase SQL Editor

-- Enable RLS (Row Level Security)
-- Note: JWT secret is managed by Supabase automatically

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE position_type AS ENUM ('GK', 'DEF', 'MID', 'FWD');
CREATE TYPE event_type AS ENUM ('goal', 'assist', 'yellow_card', 'red_card', 'clean_sheet', 'save', 'penalty_miss', 'own_goal', 'bonus');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table (Premier League teams)
CREATE TABLE public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT UNIQUE NOT NULL, -- e.g., "ARS", "MCI"
    logo_url TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table (Premier League players)
CREATE TABLE public.players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    position position_type NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    price DECIMAL(4,1) NOT NULL DEFAULT 5.0, -- e.g., 12.5 million
    total_points INTEGER DEFAULT 0,
    form DECIMAL(3,1) DEFAULT 0.0,
    selected_by_percent DECIMAL(5,2) DEFAULT 0.0,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    clean_sheets INTEGER DEFAULT 0,
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    bonus_points INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms table (Fantasy leagues/rooms)
CREATE TABLE public.rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_code TEXT UNIQUE NOT NULL, -- 6-digit shareable code
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    max_players INTEGER DEFAULT 10,
    current_players INTEGER DEFAULT 0,
    season TEXT DEFAULT '2024-25',
    gameweek INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    budget_limit DECIMAL(5,1) DEFAULT 100.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room memberships table
CREATE TABLE public.room_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(room_id, user_id)
);

-- Fixtures table (Premier League matches)
CREATE TABLE public.fixtures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gameweek INTEGER NOT NULL,
    home_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    away_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    kickoff_time TIMESTAMP WITH TIME ZONE NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    finished BOOLEAN DEFAULT false,
    minutes_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lineups table (User squads for each gameweek)
CREATE TABLE public.lineups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,
    formation TEXT DEFAULT '4-4-2',
    captain_id UUID REFERENCES public.players(id),
    vice_captain_id UUID REFERENCES public.players(id),
    total_cost DECIMAL(5,1) DEFAULT 0.0,
    total_points INTEGER DEFAULT 0,
    gameweek_points INTEGER DEFAULT 0,
    is_submitted BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, room_id, gameweek)
);

-- Lineup players table (Individual player selections)
CREATE TABLE public.lineup_players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lineup_id UUID REFERENCES public.lineups(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    position position_type NOT NULL,
    is_starter BOOLEAN DEFAULT true,
    is_captain BOOLEAN DEFAULT false,
    is_vice_captain BOOLEAN DEFAULT false,
    multiplier INTEGER DEFAULT 1, -- 1x, 2x (captain), 3x (triple captain)
    points_scored INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lineup_id, player_id)
);

-- Player events table (Goals, assists, cards, etc.)
CREATE TABLE public.player_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fixture_id UUID REFERENCES public.fixtures(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    event_type event_type NOT NULL,
    minute INTEGER,
    points INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_players_team_position ON public.players(team_id, position);
CREATE INDEX idx_players_price ON public.players(price DESC);
CREATE INDEX idx_players_total_points ON public.players(total_points DESC);
CREATE INDEX idx_room_members_room_user ON public.room_members(room_id, user_id);
CREATE INDEX idx_lineups_user_room_gameweek ON public.lineups(user_id, room_id, gameweek);
CREATE INDEX idx_lineup_players_lineup ON public.lineup_players(lineup_id);
CREATE INDEX idx_fixtures_gameweek ON public.fixtures(gameweek);
CREATE INDEX idx_player_events_fixture_player ON public.player_events(fixture_id, player_id);

-- Create view for leaderboard queries
CREATE VIEW public.leaderboard_view AS
SELECT 
    l.user_id,
    u.username,
    l.room_id,
    l.gameweek,
    l.total_points,
    l.gameweek_points,
    ROW_NUMBER() OVER (PARTITION BY l.room_id, l.gameweek ORDER BY l.gameweek_points DESC) as rank
FROM public.lineups l
JOIN public.users u ON l.user_id = u.id
WHERE l.is_submitted = true;

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineup_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR ALL USING (auth.uid() = id);

-- Users can view rooms they're members of
CREATE POLICY "Users can view joined rooms" ON public.rooms
    FOR SELECT USING (
        id IN (
            SELECT room_id FROM public.room_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Users can create rooms
CREATE POLICY "Users can create rooms" ON public.rooms
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Room members can view memberships
CREATE POLICY "Room members can view memberships" ON public.room_members
    FOR SELECT USING (
        room_id IN (
            SELECT room_id FROM public.room_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Users can join rooms
CREATE POLICY "Users can join rooms" ON public.room_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own lineups
CREATE POLICY "Users can view own lineups" ON public.lineups
    FOR ALL USING (auth.uid() = user_id);

-- Users can view lineup players for their lineups
CREATE POLICY "Users can view own lineup players" ON public.lineup_players
    FOR ALL USING (
        lineup_id IN (
            SELECT id FROM public.lineups WHERE user_id = auth.uid()
        )
    );

-- Function to generate room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM public.rooms WHERE room_code = code) INTO exists;
        IF NOT exists THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate gameweek points
CREATE OR REPLACE FUNCTION calculate_gameweek_points(lineup_uuid UUID, gw INTEGER)
RETURNS INTEGER AS $$
DECLARE
    total_points INTEGER := 0;
BEGIN
    SELECT COALESCE(SUM(lp.points_scored * lp.multiplier), 0)
    INTO total_points
    FROM public.lineup_players lp
    JOIN public.lineups l ON lp.lineup_id = l.id
    WHERE l.id = lineup_uuid AND l.gameweek = gw;
    
    RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update room player count
CREATE OR REPLACE FUNCTION update_room_player_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.rooms 
        SET current_players = current_players + 1 
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.rooms 
        SET current_players = current_players - 1 
        WHERE id = OLD.room_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_room_player_count
    AFTER INSERT OR DELETE ON public.room_members
    FOR EACH ROW EXECUTE FUNCTION update_room_player_count();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fixtures_updated_at BEFORE UPDATE ON public.fixtures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lineups_updated_at BEFORE UPDATE ON public.lineups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();