-- Premier League Players Seed Data (Simplified)
-- Key players for testing - UUIDs will be auto-generated

INSERT INTO public.players (name, position, team_id, price, total_points, goals, assists, clean_sheets, yellow_cards, red_cards, saves, bonus_points, is_available) VALUES

-- Arsenal Players
('David Raya', 'GK', '11111111-1111-1111-1111-111111111111', 5.0, 85, 0, 0, 8, 1, 0, 75, 12, true),
('William Saliba', 'DEF', '11111111-1111-1111-1111-111111111111', 6.0, 95, 1, 2, 9, 3, 0, 0, 15, true),
('Gabriel Magalhaes', 'DEF', '11111111-1111-1111-1111-111111111111', 5.5, 88, 2, 1, 8, 4, 0, 0, 12, true),
('Martin Odegaard', 'MID', '11111111-1111-1111-1111-111111111111', 8.5, 125, 8, 10, 0, 2, 0, 0, 20, true),
('Bukayo Saka', 'MID', '11111111-1111-1111-1111-111111111111', 10.0, 142, 11, 9, 0, 3, 0, 0, 25, true),
('Gabriel Jesus', 'FWD', '11111111-1111-1111-1111-111111111111', 7.0, 95, 12, 4, 0, 1, 0, 0, 16, true),

-- Manchester City Players
('Ederson', 'GK', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 5.5, 98, 0, 0, 12, 2, 0, 68, 16, true),
('Ruben Dias', 'DEF', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 6.0, 102, 1, 1, 11, 3, 0, 0, 18, true),
('Kevin De Bruyne', 'MID', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 9.5, 138, 7, 15, 0, 1, 0, 0, 28, true),
('Phil Foden', 'MID', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 8.0, 115, 9, 7, 0, 1, 0, 0, 22, true),
('Erling Haaland', 'FWD', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 15.0, 198, 28, 5, 0, 1, 0, 0, 35, true),

-- Liverpool Players
('Alisson', 'GK', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5.5, 92, 0, 0, 10, 1, 0, 72, 14, true),
('Virgil van Dijk', 'DEF', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 6.5, 108, 2, 3, 11, 2, 0, 0, 20, true),
('Andy Robertson', 'DEF', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5.5, 82, 1, 8, 9, 4, 0, 0, 13, true),
('Mohamed Salah', 'MID', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 12.5, 168, 18, 10, 0, 2, 0, 0, 32, true),
('Darwin Nunez', 'FWD', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 8.5, 118, 15, 6, 0, 3, 0, 0, 21, true),

-- Chelsea Players  
('Robert Sanchez', 'GK', '66666666-6666-6666-6666-666666666666', 4.5, 68, 0, 0, 6, 2, 0, 58, 9, true),
('Thiago Silva', 'DEF', '66666666-6666-6666-6666-666666666666', 5.0, 75, 1, 2, 7, 3, 0, 0, 11, true),
('Enzo Fernandez', 'MID', '66666666-6666-6666-6666-666666666666', 7.0, 95, 4, 7, 0, 5, 0, 0, 16, true),
('Cole Palmer', 'MID', '66666666-6666-6666-6666-666666666666', 6.5, 88, 6, 5, 0, 2, 0, 0, 14, true),
('Nicolas Jackson', 'FWD', '66666666-6666-6666-6666-666666666666', 7.5, 102, 14, 3, 0, 2, 0, 0, 18, true);

-- Add photo_url for Erling Haaland (placeholder SVG placed in public/players/erling_haaland.svg)
-- Ensure column exists, then update
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS photo_url TEXT;

UPDATE public.players
SET photo_url = '/players/erling_haaland.png'
WHERE name ILIKE '%Haaland%';