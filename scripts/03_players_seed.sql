-- Premier League Players Seed Data
-- Sample players for each team and position for 2024-25 season

INSERT INTO public.players (id, name, position, team_id, price, total_points, goals, assists, clean_sheets, yellow_cards, red_cards, saves, bonus_points, is_available) VALUES

-- Arsenal Players
-- Goalkeepers
('p00001', 'David Raya', 'GK', '11111111-1111-1111-1111-111111111111', 5.0, 85, 0, 0, 8, 1, 0, 75, 12, true),
('p00002', 'Aaron Ramsdale', 'GK', '11111111-1111-1111-1111-111111111111', 4.5, 42, 0, 0, 4, 0, 0, 38, 5, true),

-- Defenders  
('p00003', 'William Saliba', 'DEF', '11111111-1111-1111-1111-111111111111', 6.0, 95, 1, 2, 9, 3, 0, 0, 15, true),
('p00004', 'Gabriel Magalhaes', 'DEF', '11111111-1111-1111-1111-111111111111', 5.5, 88, 2, 1, 8, 4, 0, 0, 12, true),
('p00005', 'Ben White', 'DEF', '11111111-1111-1111-1111-111111111111', 5.0, 78, 0, 3, 7, 2, 0, 0, 10, true),
('p00006', 'Oleksandr Zinchenko', 'DEF', '11111111-1111-1111-1111-111111111111', 5.0, 65, 1, 4, 6, 3, 0, 0, 8, true),
('p00007', 'Takehiro Tomiyasu', 'DEF', '11111111-1111-1111-1111-111111111111', 4.5, 45, 0, 1, 5, 1, 0, 0, 6, true),

-- Midfielders
('p00008', 'Martin Odegaard', 'MID', '11111111-1111-1111-1111-111111111111', 8.5, 125, 8, 10, 0, 2, 0, 0, 20, true),
('p00009', 'Bukayo Saka', 'MID', '11111111-1111-1111-1111-111111111111', 10.0, 142, 11, 9, 0, 3, 0, 0, 25, true),
('p00010', 'Declan Rice', 'MID', '11111111-1111-1111-1111-111111111111', 6.5, 92, 3, 5, 0, 5, 0, 0, 15, true),
('p00011', 'Thomas Partey', 'MID', '11111111-1111-1111-1111-111111111111', 5.0, 68, 1, 2, 0, 4, 0, 0, 8, true),
('p00012', 'Kai Havertz', 'MID', '11111111-1111-1111-1111-111111111111', 8.0, 108, 9, 6, 0, 2, 0, 0, 18, true),

-- Forwards
('p00013', 'Gabriel Jesus', 'FWD', '11111111-1111-1111-1111-111111111111', 7.0, 95, 12, 4, 0, 1, 0, 0, 16, true),
('p00014', 'Eddie Nketiah', 'FWD', '11111111-1111-1111-1111-111111111111', 5.5, 58, 8, 2, 0, 0, 0, 0, 9, true),
('p00015', 'Gabriel Martinelli', 'FWD', '11111111-1111-1111-1111-111111111111', 7.5, 102, 10, 7, 0, 2, 0, 0, 17, true),

-- Manchester City Players
-- Goalkeepers
('p00016', 'Ederson', 'GK', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 5.5, 98, 0, 0, 12, 2, 0, 68, 16, true),
('p00017', 'Stefan Ortega', 'GK', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 4.5, 35, 0, 0, 3, 0, 0, 28, 4, true),

-- Defenders
('p00018', 'Ruben Dias', 'DEF', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 6.0, 102, 1, 1, 11, 3, 0, 0, 18, true),
('p00019', 'John Stones', 'DEF', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 5.5, 85, 0, 2, 9, 2, 0, 0, 14, true),
('p00020', 'Kyle Walker', 'DEF', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 5.5, 78, 0, 4, 8, 4, 0, 0, 12, true),
('p00021', 'Josko Gvardiol', 'DEF', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 5.0, 72, 2, 3, 7, 1, 0, 0, 11, true),
('p00022', 'Nathan Ake', 'DEF', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 5.0, 68, 1, 1, 8, 2, 0, 0, 10, true),

-- Midfielders
('p00023', 'Kevin De Bruyne', 'MID', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 9.5, 138, 7, 15, 0, 1, 0, 0, 28, true),
('p00024', 'Bernardo Silva', 'MID', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 7.0, 105, 5, 8, 0, 2, 0, 0, 19, true),
('p00025', 'Rodri', 'MID', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 6.0, 88, 2, 4, 0, 6, 0, 0, 15, true),
('p00026', 'Phil Foden', 'MID', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 8.0, 115, 9, 7, 0, 1, 0, 0, 22, true),
('p00027', 'Ilkay Gundogan', 'MID', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 6.5, 92, 4, 6, 0, 3, 0, 0, 16, true),

-- Forwards
('p00028', 'Erling Haaland', 'FWD', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 15.0, 198, 28, 5, 0, 1, 0, 0, 35, true),
('p00029', 'Julian Alvarez', 'FWD', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 7.5, 108, 14, 8, 0, 0, 0, 0, 19, true),
('p00030', 'Jack Grealish', 'FWD', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 6.5, 85, 3, 11, 0, 2, 0, 0, 14, true),

-- Liverpool Players  
-- Goalkeepers
('p00031', 'Alisson', 'GK', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5.5, 102, 0, 0, 13, 1, 0, 82, 18, true),
('p00032', 'Caoimhin Kelleher', 'GK', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 4.5, 38, 0, 0, 3, 0, 0, 25, 5, true),

-- Defenders
('p00033', 'Virgil van Dijk', 'DEF', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 6.5, 108, 3, 2, 12, 2, 0, 0, 20, true),
('p00034', 'Andrew Robertson', 'DEF', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 6.0, 95, 1, 8, 10, 4, 0, 0, 17, true),
('p00035', 'Trent Alexander-Arnold', 'DEF', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 7.5, 118, 2, 12, 9, 5, 0, 0, 22, true),
('p00036', 'Ibrahima Konate', 'DEF', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5.0, 75, 1, 0, 9, 3, 0, 0, 12, true),
('p00037', 'Joel Matip', 'DEF', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 4.5, 62, 2, 1, 7, 1, 0, 0, 9, true),

-- Midfielders
('p00038', 'Mohamed Salah', 'MID', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 12.5, 178, 22, 12, 0, 2, 0, 0, 32, true),
('p00039', 'Sadio Mane', 'MID', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 8.0, 112, 11, 9, 0, 3, 0, 0, 21, true),
('p00040', 'Fabinho', 'MID', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5.5, 78, 2, 3, 0, 8, 1, 0, 12, true),
('p00041', 'Jordan Henderson', 'MID', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5.0, 68, 1, 2, 0, 6, 0, 0, 10, true),
('p00042', 'Thiago', 'MID', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 6.0, 82, 2, 6, 0, 4, 0, 0, 14, true),

-- Forwards
('p00043', 'Darwin Nunez', 'FWD', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 8.5, 125, 18, 6, 0, 2, 0, 0, 23, true),
('p00044', 'Diogo Jota', 'FWD', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 7.5, 108, 15, 4, 0, 1, 0, 0, 19, true),
('p00045', 'Roberto Firmino', 'FWD', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 6.5, 88, 8, 7, 0, 2, 0, 0, 15, true),

-- Manchester United Players
-- Goalkeepers  
('p00046', 'Andre Onana', 'GK', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 5.0, 82, 0, 0, 9, 2, 0, 72, 14, true),
('p00047', 'Altay Bayindir', 'GK', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 4.5, 28, 0, 0, 2, 0, 0, 18, 3, true),

-- Defenders
('p00048', 'Raphael Varane', 'DEF', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 5.5, 85, 1, 1, 8, 2, 0, 0, 14, true),
('p00049', 'Lisandro Martinez', 'DEF', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 5.0, 78, 1, 2, 7, 6, 0, 0, 12, true),
('p00050', 'Luke Shaw', 'DEF', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 5.0, 72, 0, 4, 6, 3, 0, 0, 11, true),
('p00051', 'Diogo Dalot', 'DEF', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 4.5, 68, 1, 3, 5, 4, 0, 0, 10, true),
('p00052', 'Harry Maguire', 'DEF', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 4.5, 62, 2, 0, 6, 5, 0, 0, 9, true),

-- Midfielders
('p00053', 'Bruno Fernandes', 'MID', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 8.5, 128, 10, 12, 0, 7, 0, 0, 24, true),
('p00054', 'Casemiro', 'MID', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 5.5, 85, 3, 2, 0, 9, 1, 0, 14, true),
('p00055', 'Christian Eriksen', 'MID', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 5.5, 82, 2, 8, 0, 2, 0, 0, 13, true),
('p00056', 'Mason Mount', 'MID', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 6.0, 75, 3, 4, 0, 3, 0, 0, 12, true),
('p00057', 'Antony', 'MID', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 6.5, 68, 4, 2, 0, 4, 0, 0, 10, true),

-- Forwards
('p00058', 'Marcus Rashford', 'FWD', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 8.0, 118, 16, 7, 0, 3, 0, 0, 22, true),
('p00059', 'Anthony Martial', 'FWD', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 6.0, 72, 9, 3, 0, 1, 0, 0, 12, true),
('p00060', 'Rasmus Hojlund', 'FWD', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 7.0, 88, 12, 2, 0, 2, 0, 0, 15, true),

-- Chelsea Players
-- Goalkeepers
('p00061', 'Robert Sanchez', 'GK', '66666666-6666-6666-6666-666666666666', 4.5, 68, 0, 0, 6, 1, 0, 58, 10, true),
('p00062', 'Djordje Petrovic', 'GK', '66666666-6666-6666-6666-666666666666', 4.5, 45, 0, 0, 4, 0, 0, 32, 6, true),

-- Defenders  
('p00063', 'Thiago Silva', 'DEF', '66666666-6666-6666-6666-666666666666', 5.0, 85, 1, 1, 8, 2, 0, 0, 14, true),
('p00064', 'Reece James', 'DEF', '66666666-6666-6666-6666-666666666666', 6.0, 92, 2, 6, 7, 4, 0, 0, 16, true),
('p00065', 'Ben Chilwell', 'DEF', '66666666-6666-6666-6666-666666666666', 5.5, 78, 1, 4, 6, 2, 0, 0, 12, true),
('p00066', 'Wesley Fofana', 'DEF', '66666666-6666-6666-6666-666666666666', 4.5, 62, 0, 1, 5, 3, 0, 0, 9, true),
('p00067', 'Malo Gusto', 'DEF', '66666666-6666-6666-6666-666666666666', 4.5, 58, 0, 2, 4, 1, 0, 0, 8, true),

-- Midfielders
('p00068', 'Enzo Fernandez', 'MID', '66666666-6666-6666-6666-666666666666', 6.5, 98, 4, 7, 0, 5, 0, 0, 17, true),
('p00069', 'Moises Caicedo', 'MID', '66666666-6666-6666-6666-666666666666', 5.5, 82, 2, 3, 0, 6, 0, 0, 13, true),
('p00070', 'Conor Gallagher', 'MID', '66666666-6666-6666-6666-666666666666', 5.5, 88, 5, 4, 0, 7, 1, 0, 15, true),
('p00071', 'Raheem Sterling', 'MID', '66666666-6666-6666-6666-666666666666', 7.0, 105, 8, 9, 0, 2, 0, 0, 19, true),
('p00072', 'Cole Palmer', 'MID', '66666666-6666-6666-6666-666666666666', 6.0, 92, 6, 5, 0, 1, 0, 0, 16, true),

-- Forwards
('p00073', 'Nicolas Jackson', 'FWD', '66666666-6666-6666-6666-666666666666', 7.0, 95, 13, 4, 0, 2, 0, 0, 17, true),
('p00074', 'Christopher Nkunku', 'FWD', '66666666-6666-6666-6666-666666666666', 6.5, 85, 10, 6, 0, 1, 0, 0, 15, true),
('p00075', 'Mykhaylo Mudryk', 'FWD', '66666666-6666-6666-6666-666666666666', 6.0, 72, 7, 3, 0, 3, 0, 0, 12, true),

-- Tottenham Players
-- Goalkeepers
('p00076', 'Guglielmo Vicario', 'GK', '00000000-0000-0000-0000-000000000003', 5.0, 88, 0, 0, 10, 2, 0, 75, 15, true),
('p00077', 'Fraser Forster', 'GK', '00000000-0000-0000-0000-000000000003', 4.5, 32, 0, 0, 2, 0, 0, 22, 4, true),

-- Defenders
('p00078', 'Cristian Romero', 'DEF', '00000000-0000-0000-0000-000000000003', 5.0, 82, 2, 1, 8, 6, 1, 0, 13, true),
('p00079', 'Micky van de Ven', 'DEF', '00000000-0000-0000-0000-000000000003', 4.5, 75, 1, 2, 7, 2, 0, 0, 12, true),
('p00080', 'Pedro Porro', 'DEF', '00000000-0000-0000-0000-000000000003', 5.5, 88, 1, 6, 6, 4, 0, 0, 15, true),
('p00081', 'Destiny Udogie', 'DEF', '00000000-0000-0000-0000-000000000003', 4.5, 72, 0, 3, 5, 3, 0, 0, 11, true),
('p00082', 'Ben Davies', 'DEF', '00000000-0000-0000-0000-000000000003', 4.0, 58, 1, 1, 4, 2, 0, 0, 8, true),

-- Midfielders
('p00083', 'James Maddison', 'MID', '00000000-0000-0000-0000-000000000003', 8.0, 115, 7, 11, 0, 3, 0, 0, 21, true),
('p00084', 'Dejan Kulusevski', 'MID', '00000000-0000-0000-0000-000000000003', 6.5, 98, 5, 8, 0, 2, 0, 0, 17, true),
('p00085', 'Yves Bissouma', 'MID', '00000000-0000-0000-0000-000000000003', 4.5, 65, 1, 2, 0, 5, 0, 0, 9, true),
('p00086', 'Pape Sarr', 'MID', '00000000-0000-0000-0000-000000000003', 4.5, 68, 2, 3, 0, 3, 0, 0, 10, true),
('p00087', 'Brennan Johnson', 'MID', '00000000-0000-0000-0000-000000000003', 5.5, 78, 6, 4, 0, 1, 0, 0, 13, true),

-- Forwards
('p00088', 'Son Heung-min', 'FWD', '00000000-0000-0000-0000-000000000003', 9.5, 138, 19, 8, 0, 1, 0, 0, 26, true),
('p00089', 'Richarlison', 'FWD', '00000000-0000-0000-0000-000000000003', 6.0, 82, 11, 3, 0, 4, 0, 0, 14, true),
('p00090', 'Timo Werner', 'FWD', '00000000-0000-0000-0000-000000000003', 6.5, 88, 9, 6, 0, 2, 0, 0, 15, true),

-- Newcastle United Players
-- Goalkeepers
('p00091', 'Nick Pope', 'GK', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 5.0, 92, 0, 0, 11, 1, 0, 78, 16, true),
('p00092', 'Martin Dubravka', 'GK', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 4.5, 38, 0, 0, 3, 0, 0, 28, 5, true),

-- Defenders
('p00093', 'Sven Botman', 'DEF', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 5.0, 85, 2, 0, 9, 3, 0, 0, 14, true),
('p00094', 'Fabian Schar', 'DEF', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 5.0, 82, 1, 2, 8, 4, 0, 0, 13, true),
('p00095', 'Dan Burn', 'DEF', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 4.5, 72, 1, 1, 7, 2, 0, 0, 11, true),
('p00096', 'Kieran Trippier', 'DEF', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 6.0, 95, 0, 8, 8, 5, 0, 0, 17, true),
('p00097', 'Tino Livramento', 'DEF', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 4.5, 68, 0, 3, 6, 1, 0, 0, 10, true),

-- Midfielders  
('p00098', 'Bruno Guimaraes', 'MID', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 6.5, 105, 4, 6, 0, 8, 0, 0, 19, true),
('p00099', 'Joelinton', 'MID', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 5.5, 88, 6, 4, 0, 5, 0, 0, 15, true),
('p00100', 'Sean Longstaff', 'MID', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 4.5, 65, 2, 3, 0, 4, 0, 0, 10, true),
('p00101', 'Anthony Gordon', 'MID', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 6.0, 92, 7, 5, 0, 2, 0, 0, 16, true),
('p00102', 'Miguel Almiron', 'MID', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 5.5, 78, 5, 3, 0, 3, 0, 0, 13, true),

-- Forwards
('p00103', 'Alexander Isak', 'FWD', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 8.5, 125, 18, 4, 0, 1, 0, 0, 23, true),
('p00104', 'Callum Wilson', 'FWD', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 7.0, 98, 14, 5, 0, 2, 0, 0, 17, true),
('p00105', 'Harvey Barnes', 'FWD', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 6.0, 85, 8, 7, 0, 1, 0, 0, 15, true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_position ON public.players(position);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON public.players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_price ON public.players(price);
CREATE INDEX IF NOT EXISTS idx_players_total_points ON public.players(total_points);
CREATE INDEX IF NOT EXISTS idx_players_is_available ON public.players(is_available);
CREATE INDEX IF NOT EXISTS idx_players_name ON public.players(name);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_players_team_position ON public.players(team_id, position);
CREATE INDEX IF NOT EXISTS idx_players_available_price ON public.players(is_available, price) WHERE is_available = true;