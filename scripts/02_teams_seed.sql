-- Premier League Teams Seed Data
-- Insert all 20 Premier League teams for 2024-25 season

INSERT INTO public.teams (id, name, short_name, logo_url, primary_color, secondary_color) VALUES
-- Arsenal
('11111111-1111-1111-1111-111111111111', 'Arsenal', 'ARS', null, '#DC143C', '#FFD700'),

-- Aston Villa  
('22222222-2222-2222-2222-222222222222', 'Aston Villa', 'AVL', null, '#95BFE5', '#670E36'),

-- Bournemouth
('33333333-3333-3333-3333-333333333333', 'AFC Bournemouth', 'BOU', null, '#DA020E', '#000000'),

-- Brentford
('44444444-4444-4444-4444-444444444444', 'Brentford', 'BRE', null, '#E30613', '#FFC20E'),

-- Brighton
('55555555-5555-5555-5555-555555555555', 'Brighton & Hove Albion', 'BHA', null, '#0057B8', '#FFCD00'),

-- Chelsea
('66666666-6666-6666-6666-666666666666', 'Chelsea', 'CHE', null, '#034694', '#6CABDD'),

-- Crystal Palace
('77777777-7777-7777-7777-777777777777', 'Crystal Palace', 'CRY', null, '#1B458F', '#A7A5A6'),

-- Everton
('88888888-8888-8888-8888-888888888888', 'Everton', 'EVE', null, '#003399', '#FFFFFF'),

-- Fulham
('99999999-9999-9999-9999-999999999999', 'Fulham', 'FUL', null, '#FFFFFF', '#000000'),

-- Ipswich Town
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ipswich Town', 'IPS', null, '#0080FF', '#FFFFFF'),

-- Leicester City
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Leicester City', 'LEI', null, '#003090', '#FDBE11'),

-- Liverpool
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Liverpool', 'LIV', null, '#C8102E', '#F6EB61'),

-- Manchester City
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Manchester City', 'MCI', null, '#6CABDD', '#1C2C5B'),

-- Manchester United
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Manchester United', 'MUN', null, '#DA020E', '#FBE122'),

-- Newcastle United
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Newcastle United', 'NEW', null, '#241F20', '#FFFFFF'),

-- Nottingham Forest
('00000000-0000-0000-0000-000000000001', 'Nottingham Forest', 'NFO', null, '#DD0000', '#FFFF00'),

-- Southampton
('00000000-0000-0000-0000-000000000002', 'Southampton', 'SOU', null, '#D71920', '#FFC20E'),

-- Tottenham Hotspur
('00000000-0000-0000-0000-000000000003', 'Tottenham Hotspur', 'TOT', null, '#132257', '#FFFFFF'),

-- West Ham United
('00000000-0000-0000-0000-000000000004', 'West Ham United', 'WHU', null, '#7A263A', '#1BB1E7'),

-- Wolverhampton Wanderers
('00000000-0000-0000-0000-000000000005', 'Wolverhampton Wanderers', 'WOL', null, '#FDB913', '#231F20');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_short_name ON public.teams(short_name);
CREATE INDEX IF NOT EXISTS idx_teams_name ON public.teams(name);