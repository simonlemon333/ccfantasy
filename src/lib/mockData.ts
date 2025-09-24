// Mock data for development when Supabase is unavailable
export const mockTeams = [
  { id: '1', name: 'Arsenal', short_name: 'ARS', logo_url: '/teams/arsenal.png', primary_color: '#EF0107' },
  { id: '2', name: 'Manchester City', short_name: 'MCI', logo_url: '/teams/mancity.png', primary_color: '#6CABDD' },
  { id: '3', name: 'Liverpool', short_name: 'LIV', logo_url: '/teams/liverpool.png', primary_color: '#C8102E' },
  { id: '4', name: 'Chelsea', short_name: 'CHE', logo_url: '/teams/chelsea.png', primary_color: '#034694' },
  { id: '5', name: 'Manchester United', short_name: 'MUN', logo_url: '/teams/manutd.png', primary_color: '#DA020E' },
];

export const mockPlayers = [
  {
    id: '1',
    name: 'Erling Haaland',
    position: 'FWD',
    team_id: '2',
    price: 15.0,
    total_points: 234,
    form: 8.2,
    goals: 27,
    assists: 5,
    selected_by_percent: 85.4,
    clean_sheets: 0,
    is_available: true,
    teams: mockTeams[1]
  },
  {
    id: '2',
    name: 'Mohamed Salah',
    position: 'FWD',
    team_id: '3',
    price: 13.0,
    total_points: 211,
    form: 7.8,
    goals: 18,
    assists: 12,
    selected_by_percent: 67.3,
    clean_sheets: 0,
    is_available: true,
    teams: mockTeams[2]
  },
  {
    id: '3',
    name: 'Bukayo Saka',
    position: 'MID',
    team_id: '1',
    price: 9.5,
    total_points: 168,
    form: 6.9,
    goals: 8,
    assists: 9,
    selected_by_percent: 43.2,
    clean_sheets: 0,
    is_available: true,
    teams: mockTeams[0]
  },
  {
    id: '4',
    name: 'Virgil van Dijk',
    position: 'DEF',
    team_id: '3',
    price: 6.5,
    total_points: 145,
    form: 6.2,
    goals: 3,
    assists: 2,
    selected_by_percent: 28.7,
    clean_sheets: 12,
    is_available: true,
    teams: mockTeams[2]
  },
  {
    id: '5',
    name: 'Alisson',
    position: 'GK',
    team_id: '3',
    price: 5.5,
    total_points: 134,
    form: 5.8,
    goals: 0,
    assists: 1,
    selected_by_percent: 22.1,
    clean_sheets: 13,
    is_available: true,
    teams: mockTeams[2]
  }
];

export const mockRooms = [
  {
    id: '1',
    name: 'Friends League',
    room_code: 'ABC123',
    budget_limit: 100,
    current_gameweek: 10,
    is_public: false,
    created_at: '2024-08-01T00:00:00Z'
  }
];

export const mockLineups = [];
export const mockLeaderboard = [];