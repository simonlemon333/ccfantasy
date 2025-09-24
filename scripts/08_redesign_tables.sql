-- 08_redesign_tables.sql
-- 重新设计teams和fixtures表，使用更直观的ID结构

-- 备份现有数据
CREATE TABLE teams_backup AS SELECT * FROM teams;
CREATE TABLE fixtures_backup AS SELECT * FROM fixtures;
CREATE TABLE players_backup AS SELECT * FROM players;

-- 删除现有表（注意外键约束）
DROP TABLE IF EXISTS fixtures CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- 创建新的teams表（使用FPL team ID作为主键）
CREATE TABLE teams (
  id INTEGER PRIMARY KEY,           -- FPL team ID (1-20)
  name VARCHAR(50) NOT NULL,        -- "Arsenal"
  short_name VARCHAR(3) NOT NULL,   -- "ARS"
  code INTEGER,                     -- FPL team code
  logo_url VARCHAR(255),
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建新的fixtures表（使用FPL fixture ID作为主键，team names直接存储）
CREATE TABLE fixtures (
  id INTEGER PRIMARY KEY,           -- FPL fixture ID
  gameweek INTEGER NOT NULL,        -- 1-38
  home_team VARCHAR(3) NOT NULL,    -- 队伍短名称 (e.g., "ARS", "MCI")
  away_team VARCHAR(3) NOT NULL,    -- 队伍短名称 (e.g., "CHE", "LIV")
  kickoff_time TIMESTAMP,
  home_score INTEGER,
  away_score INTEGER,
  finished BOOLEAN DEFAULT FALSE,
  minutes_played INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 插入20支英超球队数据（使用正确的FPL ID和官方logo URL）
INSERT INTO teams (id, name, short_name, code, primary_color, logo_url) VALUES
(1, 'Arsenal', 'ARS', 3, '#EF0107', 'https://resources.premierleague.com/premierleague/badges/50/t3.png'),
(2, 'Aston Villa', 'AVL', 7, '#95BFE5', 'https://resources.premierleague.com/premierleague/badges/50/t7.png'),
(3, 'Bournemouth', 'BOU', 91, '#DA020E', 'https://resources.premierleague.com/premierleague/badges/50/t91.png'),
(4, 'Brentford', 'BRE', 94, '#E30613', 'https://resources.premierleague.com/premierleague/badges/50/t94.png'),
(5, 'Brighton & Hove Albion', 'BHA', 36, '#0057B8', 'https://resources.premierleague.com/premierleague/badges/50/t36.png'),
(6, 'Chelsea', 'CHE', 8, '#034694', 'https://resources.premierleague.com/premierleague/badges/50/t8.png'),
(7, 'Crystal Palace', 'CRY', 31, '#1B458F', 'https://resources.premierleague.com/premierleague/badges/50/t31.png'),
(8, 'Everton', 'EVE', 11, '#003399', 'https://resources.premierleague.com/premierleague/badges/50/t11.png'),
(9, 'Fulham', 'FUL', 54, '#CC9966', 'https://resources.premierleague.com/premierleague/badges/50/t54.png'),
(10, 'Ipswich Town', 'IPS', 40, '#4C9AFF', 'https://resources.premierleague.com/premierleague/badges/50/t40.png'),
(11, 'Leicester City', 'LEI', 13, '#003090', 'https://resources.premierleague.com/premierleague/badges/50/t13.png'),
(12, 'Liverpool', 'LIV', 14, '#C8102E', 'https://resources.premierleague.com/premierleague/badges/50/t14.png'),
(13, 'Manchester City', 'MCI', 43, '#6CABDD', 'https://resources.premierleague.com/premierleague/badges/50/t43.png'),
(14, 'Manchester United', 'MUN', 1, '#DA020E', 'https://resources.premierleague.com/premierleague/badges/50/t1.png'),
(15, 'Newcastle United', 'NEW', 4, '#241F20', 'https://resources.premierleague.com/premierleague/badges/50/t4.png'),
(16, 'Nottingham Forest', 'NOT', 17, '#DD0000', 'https://resources.premierleague.com/premierleague/badges/50/t17.png'),
(17, 'Southampton', 'SOU', 20, '#D71920', 'https://resources.premierleague.com/premierleague/badges/50/t20.png'),
(18, 'Tottenham Hotspur', 'TOT', 6, '#132257', 'https://resources.premierleague.com/premierleague/badges/50/t6.png'),
(19, 'West Ham United', 'WHU', 21, '#7A263A', 'https://resources.premierleague.com/premierleague/badges/50/t21.png'),
(20, 'Wolverhampton Wanderers', 'WOL', 39, '#FDB914', 'https://resources.premierleague.com/premierleague/badges/50/t39.png');

-- 创建新的players表（使用team short name而不是team_id）
CREATE TABLE players (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  position VARCHAR(3) NOT NULL CHECK (position IN ('GK', 'DEF', 'MID', 'FWD')),
  team VARCHAR(3) NOT NULL,              -- 队伍短名称 (e.g., "ARS", "MCI")
  price DECIMAL(4,1) NOT NULL,           -- 价格，以百万为单位
  total_points INTEGER DEFAULT 0,
  form DECIMAL(3,1) DEFAULT 0,
  selected_by_percent DECIMAL(5,2) DEFAULT 0,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  clean_sheets INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  bonus_points INTEGER DEFAULT 0,
  photo_url VARCHAR(255),               -- 球员头像URL
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引提升性能
CREATE INDEX idx_fixtures_gameweek ON fixtures(gameweek);
CREATE INDEX idx_fixtures_teams ON fixtures(home_team, away_team);
CREATE INDEX idx_fixtures_finished ON fixtures(finished);
CREATE INDEX idx_players_team ON players(team);
CREATE INDEX idx_players_position ON players(position);
CREATE INDEX idx_players_price ON players(price);

-- 添加注释
COMMENT ON TABLE teams IS '英超球队表 - 使用FPL team ID作为主键';
COMMENT ON TABLE fixtures IS '比赛赛程表 - 使用FPL fixture ID作为主键，直接存储队伍短名称';
COMMENT ON TABLE players IS '球员表 - 直接存储队伍短名称，无需外键关联';

-- 显示创建结果
SELECT 'Teams表创建完成，包含' || COUNT(*) || '支球队' as status FROM teams;
SELECT 'Players表创建完成' as status;
SELECT 'Fixtures表创建完成' as status;