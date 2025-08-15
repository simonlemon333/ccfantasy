// Fantasy Premier League API integration
// The FPL API is free and doesn't require authentication

interface FPLBootstrapData {
  elements: FPLPlayer[];
  teams: FPLTeam[];
  events: FPLGameweek[];
}

interface FPLPlayer {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  element_type: number; // 1=GK, 2=DEF, 3=MID, 4=FWD
  team: number;
  now_cost: number; // Price in FPL units (multiply by 0.1 for millions)
  total_points: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  form: string;
  selected_by_percent: string;
  photo: string; // JPG filename like "123456.jpg"
}

interface FPLTeam {
  id: number;
  name: string;
  short_name: string;
  code: number;
}

interface FPLGameweek {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
}

class FPLApiService {
  private readonly baseUrl = 'https://fantasy.premierleague.com/api';
  
  async getBootstrapData(): Promise<FPLBootstrapData> {
    const response = await fetch(`${this.baseUrl}/bootstrap-static/`);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.status}`);
    }
    return await response.json();
  }

  async getCurrentGameweek(): Promise<number> {
    const data = await this.getBootstrapData();
    const currentGW = data.events.find(event => event.is_current);
    return currentGW?.id || 1;
  }

  async getAllPlayers(): Promise<FPLPlayer[]> {
    const data = await this.getBootstrapData();
    return data.elements;
  }

  async getAllTeams(): Promise<FPLTeam[]> {
    const data = await this.getBootstrapData();
    return data.teams;
  }

  // Convert FPL position type to our position type
  convertPosition(elementType: number): 'GK' | 'DEF' | 'MID' | 'FWD' {
    switch (elementType) {
      case 1: return 'GK';
      case 2: return 'DEF';
      case 3: return 'MID';
      case 4: return 'FWD';
      default: return 'MID';
    }
  }

  // Convert FPL price to our price format
  convertPrice(nowCost: number): number {
    return nowCost / 10; // FPL stores price in tenths of millions
  }

  // Get player photo URL
  getPlayerPhotoUrl(photoFilename: string): string {
    if (!photoFilename) return '/players/default.jpg';
    return `https://resources.premierleague.com/premierleague/photos/players/250x250/p${photoFilename.replace('.jpg', '')}.png`;
  }

  // Map FPL team to our team UUID (you'll need to create this mapping)
  mapTeamToUuid(fplTeamId: number): string {
    const teamMapping: Record<number, string> = {
      1: '11111111-1111-1111-1111-111111111111', // Arsenal
      2: '22222222-2222-2222-2222-222222222222', // Aston Villa
      3: '33333333-3333-3333-3333-333333333333', // Bournemouth
      4: '44444444-4444-4444-4444-444444444444', // Brentford
      5: '55555555-5555-5555-5555-555555555555', // Brighton
      6: '66666666-6666-6666-6666-666666666666', // Chelsea
      7: '77777777-7777-7777-7777-777777777777', // Crystal Palace
      8: '88888888-8888-8888-8888-888888888888', // Everton
      9: '99999999-9999-9999-9999-999999999999', // Fulham
      10: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Ipswich
      11: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Leicester
      12: 'cccccccc-cccc-cccc-cccc-cccccccccccc', // Liverpool
      13: 'dddddddd-dddd-dddd-dddd-dddddddddddd', // Man City
      14: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', // Man United
      15: 'ffffffff-ffff-ffff-ffff-ffffffffffff', // Newcastle
      16: '00000000-0000-0000-0000-000000000001', // Nottingham Forest
      17: '00000000-0000-0000-0000-000000000002', // Southampton
      18: '00000000-0000-0000-0000-000000000003', // Tottenham
      19: '00000000-0000-0000-0000-000000000004', // West Ham
      20: '00000000-0000-0000-0000-000000000005', // Wolves
    };
    
    return teamMapping[fplTeamId] || '11111111-1111-1111-1111-111111111111';
  }
}

export const fplApi = new FPLApiService();
export type { FPLPlayer, FPLTeam, FPLGameweek };