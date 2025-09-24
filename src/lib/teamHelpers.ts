// Team helper functions for new simplified table structure

export interface TeamInfo {
  id: number;
  name: string;
  short_name: string;
  code: number;
  primary_color: string;
  logo_url: string;
}

// Map of team short names to their information
export const TEAM_INFO_MAP: Record<string, TeamInfo> = {
  'ARS': {
    id: 1,
    name: 'Arsenal',
    short_name: 'ARS',
    code: 3,
    primary_color: '#EF0107',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t3.png'
  },
  'AVL': {
    id: 2,
    name: 'Aston Villa',
    short_name: 'AVL',
    code: 7,
    primary_color: '#95BFE5',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t7.png'
  },
  'BOU': {
    id: 3,
    name: 'Bournemouth',
    short_name: 'BOU',
    code: 91,
    primary_color: '#DA020E',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t91.png'
  },
  'BRE': {
    id: 4,
    name: 'Brentford',
    short_name: 'BRE',
    code: 94,
    primary_color: '#E30613',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t94.png'
  },
  'BHA': {
    id: 5,
    name: 'Brighton & Hove Albion',
    short_name: 'BHA',
    code: 36,
    primary_color: '#0057B8',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t36.png'
  },
  'CHE': {
    id: 6,
    name: 'Chelsea',
    short_name: 'CHE',
    code: 8,
    primary_color: '#034694',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t8.png'
  },
  'CRY': {
    id: 7,
    name: 'Crystal Palace',
    short_name: 'CRY',
    code: 31,
    primary_color: '#1B458F',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t31.png'
  },
  'EVE': {
    id: 8,
    name: 'Everton',
    short_name: 'EVE',
    code: 11,
    primary_color: '#003399',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t11.png'
  },
  'FUL': {
    id: 9,
    name: 'Fulham',
    short_name: 'FUL',
    code: 54,
    primary_color: '#CC9966',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t54.png'
  },
  'IPS': {
    id: 10,
    name: 'Ipswich Town',
    short_name: 'IPS',
    code: 40,
    primary_color: '#4C9AFF',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t40.png'
  },
  'LEI': {
    id: 11,
    name: 'Leicester City',
    short_name: 'LEI',
    code: 13,
    primary_color: '#003090',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t13.png'
  },
  'LIV': {
    id: 12,
    name: 'Liverpool',
    short_name: 'LIV',
    code: 14,
    primary_color: '#C8102E',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t14.png'
  },
  'MCI': {
    id: 13,
    name: 'Manchester City',
    short_name: 'MCI',
    code: 43,
    primary_color: '#6CABDD',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t43.png'
  },
  'MUN': {
    id: 14,
    name: 'Manchester United',
    short_name: 'MUN',
    code: 1,
    primary_color: '#DA020E',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t1.png'
  },
  'NEW': {
    id: 15,
    name: 'Newcastle United',
    short_name: 'NEW',
    code: 4,
    primary_color: '#241F20',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t4.png'
  },
  'NFO': {
    id: 16,
    name: 'Nottingham Forest',
    short_name: 'NFO',
    code: 17,
    primary_color: '#DD0000',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t17.png'
  },
  'SOU': {
    id: 17,
    name: 'Southampton',
    short_name: 'SOU',
    code: 20,
    primary_color: '#D71920',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t20.png'
  },
  'TOT': {
    id: 18,
    name: 'Tottenham Hotspur',
    short_name: 'TOT',
    code: 6,
    primary_color: '#132257',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t6.png'
  },
  'WHU': {
    id: 19,
    name: 'West Ham United',
    short_name: 'WHU',
    code: 21,
    primary_color: '#7A263A',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t21.png'
  },
  'WOL': {
    id: 20,
    name: 'Wolverhampton Wanderers',
    short_name: 'WOL',
    code: 39,
    primary_color: '#FDB914',
    logo_url: 'https://resources.premierleague.com/premierleague/badges/50/t39.png'
  }
};

// Get team information by short name
export function getTeamInfo(shortName: string): TeamInfo | null {
  return TEAM_INFO_MAP[shortName.toUpperCase()] || null;
}

// Get team logo URL by short name
export function getTeamLogo(shortName: string): string | null {
  const team = getTeamInfo(shortName);
  return team?.logo_url || null;
}

// Get team full name by short name
export function getTeamName(shortName: string): string {
  const team = getTeamInfo(shortName);
  return team?.name || shortName;
}

// Get team primary color by short name
export function getTeamColor(shortName: string): string | null {
  const team = getTeamInfo(shortName);
  return team?.primary_color || null;
}