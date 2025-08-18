// Multi-source sports data aggregation
// Combines FPL API, Football-Data.org, and other sources for comprehensive fixture data

interface DataSource {
  name: string;
  priority: number; // 1 = highest priority
  rateLimit: number; // requests per minute
  apiKey?: string;
  baseUrl: string;
}

interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty' | 'own_goal';
  player: string;
  team: string;
  description?: string;
}

interface DetailedFixture {
  id: string;
  gameweek: number;
  homeTeam: {
    id: string;
    name: string;
    shortName: string;
  };
  awayTeam: {
    id: string;
    name: string;
    shortName: string;
  };
  kickoffTime: string;
  homeScore: number | null;
  awayScore: number | null;
  finished: boolean;
  minutesPlayed: number;
  events: MatchEvent[];
  lastUpdated: string;
  dataSource: string;
}

class MultiSourceDataService {
  private dataSources: DataSource[] = [
    {
      name: 'FPL',
      priority: 1,
      rateLimit: 1000, // No official limit
      baseUrl: 'https://fantasy.premierleague.com/api'
    },
    {
      name: 'Football-Data',
      priority: 2,
      rateLimit: 10, // 10 per minute
      apiKey: process.env.FOOTBALL_DATA_API_KEY,
      baseUrl: 'https://api.football-data.org/v4'
    },
    {
      name: 'ESPN',
      priority: 3,
      rateLimit: 60,
      baseUrl: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1'
    }
  ];

  private lastRequests: Record<string, number[]> = {};

  // Rate limiting check
  private canMakeRequest(sourceName: string): boolean {
    const source = this.dataSources.find(s => s.name === sourceName);
    if (!source) return false;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    if (!this.lastRequests[sourceName]) {
      this.lastRequests[sourceName] = [];
    }

    // Remove requests older than 1 minute
    this.lastRequests[sourceName] = this.lastRequests[sourceName].filter(time => time > oneMinuteAgo);

    return this.lastRequests[sourceName].length < source.rateLimit;
  }

  private recordRequest(sourceName: string): void {
    if (!this.lastRequests[sourceName]) {
      this.lastRequests[sourceName] = [];
    }
    this.lastRequests[sourceName].push(Date.now());
  }

  // FPL API methods
  async getFPLFixtures(gameweek?: number): Promise<any[]> {
    if (!this.canMakeRequest('FPL')) {
      throw new Error('FPL API rate limit exceeded');
    }

    let url = `${this.dataSources[0].baseUrl}/fixtures/`;
    if (gameweek) {
      url += `?event=${gameweek}`;
    }

    this.recordRequest('FPL');
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.status}`);
    }

    return await response.json();
  }

  // Football-Data.org API methods
  async getFootballDataFixtures(dateFrom?: string, dateTo?: string): Promise<any> {
    if (!this.canMakeRequest('Football-Data')) {
      throw new Error('Football-Data API rate limit exceeded');
    }

    const source = this.dataSources.find(s => s.name === 'Football-Data');
    if (!source?.apiKey) {
      throw new Error('Football-Data API key not configured');
    }

    let url = `${source.baseUrl}/competitions/PL/matches`;
    const params = new URLSearchParams();
    
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    this.recordRequest('Football-Data');
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': source.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Football-Data API error: ${response.status}`);
    }

    return await response.json();
  }

  // ESPN API methods (public, no auth needed)
  async getESPNFixtures(): Promise<any> {
    if (!this.canMakeRequest('ESPN')) {
      throw new Error('ESPN API rate limit exceeded');
    }

    const source = this.dataSources.find(s => s.name === 'ESPN');
    const url = `${source.baseUrl}/scoreboard`;

    this.recordRequest('ESPN');
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }

    return await response.json();
  }

  // Get comprehensive fixture data with fallback
  async getDetailedFixtures(gameweek?: number, includeEvents = true): Promise<DetailedFixture[]> {
    const results: DetailedFixture[] = [];
    const errors: string[] = [];

    // Try each data source in priority order
    for (const source of this.dataSources.sort((a, b) => a.priority - b.priority)) {
      try {
        console.log(`Trying ${source.name} API...`);
        
        let fixtures: any[] = [];
        
        switch (source.name) {
          case 'FPL':
            fixtures = await this.getFPLFixtures(gameweek);
            results.push(...this.transformFPLFixtures(fixtures));
            break;
            
          case 'Football-Data':
            if (source.apiKey) {
              const data = await this.getFootballDataFixtures();
              results.push(...this.transformFootballDataFixtures(data.matches, includeEvents));
            }
            break;
            
          case 'ESPN':
            const espnData = await this.getESPNFixtures();
            results.push(...this.transformESPNFixtures(espnData.events));
            break;
        }
        
        console.log(`${source.name}: Successfully fetched ${fixtures.length} fixtures`);
        
      } catch (error) {
        console.error(`${source.name} API failed:`, error);
        errors.push(`${source.name}: ${error.message}`);
      }
    }

    // Deduplicate and merge results
    const mergedResults = this.mergeFixtures(results);
    
    console.log(`Total unique fixtures: ${mergedResults.length}`);
    if (errors.length > 0) {
      console.warn('API errors:', errors);
    }

    return mergedResults;
  }

  // Transform FPL fixtures to common format
  private transformFPLFixtures(fixtures: any[]): DetailedFixture[] {
    return fixtures.map(fixture => ({
      id: `fpl-${fixture.id}`,
      gameweek: fixture.event,
      homeTeam: {
        id: fixture.team_h.toString(),
        name: '', // Will need team mapping
        shortName: ''
      },
      awayTeam: {
        id: fixture.team_a.toString(),
        name: '',
        shortName: ''
      },
      kickoffTime: fixture.kickoff_time,
      homeScore: fixture.team_h_score,
      awayScore: fixture.team_a_score,
      finished: fixture.finished,
      minutesPlayed: fixture.minutes || 0,
      events: [], // FPL doesn't provide detailed events
      lastUpdated: new Date().toISOString(),
      dataSource: 'FPL'
    }));
  }

  // Transform Football-Data fixtures to common format
  private transformFootballDataFixtures(fixtures: any[], includeEvents = true): DetailedFixture[] {
    return fixtures.map(fixture => {
      const events: MatchEvent[] = [];
      
      if (includeEvents && fixture.goals) {
        // Transform goals to events
        fixture.goals.forEach((goal: any) => {
          events.push({
            minute: goal.minute,
            type: goal.type === 'OwnGoal' ? 'own_goal' : 'goal',
            player: goal.scorer.name,
            team: goal.team.name,
            description: `${goal.scorer.name} ${goal.type === 'Penalty' ? '(Penalty)' : ''}`
          });
        });
      }

      return {
        id: `fd-${fixture.id}`,
        gameweek: 0, // Will need to map to gameweek
        homeTeam: {
          id: fixture.homeTeam.id.toString(),
          name: fixture.homeTeam.name,
          shortName: fixture.homeTeam.tla
        },
        awayTeam: {
          id: fixture.awayTeam.id.toString(),
          name: fixture.awayTeam.name,
          shortName: fixture.awayTeam.tla
        },
        kickoffTime: fixture.utcDate,
        homeScore: fixture.score.fullTime.home,
        awayScore: fixture.score.fullTime.away,
        finished: fixture.status === 'FINISHED',
        minutesPlayed: fixture.minute || 0,
        events,
        lastUpdated: new Date().toISOString(),
        dataSource: 'Football-Data'
      };
    });
  }

  // Transform ESPN fixtures to common format
  private transformESPNFixtures(fixtures: any[]): DetailedFixture[] {
    return fixtures.map(fixture => ({
      id: `espn-${fixture.id}`,
      gameweek: 0, // Will need to map
      homeTeam: {
        id: fixture.competitions[0].competitors[0].id,
        name: fixture.competitions[0].competitors[0].team.displayName,
        shortName: fixture.competitions[0].competitors[0].team.abbreviation
      },
      awayTeam: {
        id: fixture.competitions[0].competitors[1].id,
        name: fixture.competitions[0].competitors[1].team.displayName,
        shortName: fixture.competitions[0].competitors[1].team.abbreviation
      },
      kickoffTime: fixture.date,
      homeScore: fixture.competitions[0].competitors[0].score,
      awayScore: fixture.competitions[0].competitors[1].score,
      finished: fixture.status.type.completed,
      minutesPlayed: 0, // ESPN doesn't provide minutes
      events: [], // Would need separate API call for events
      lastUpdated: new Date().toISOString(),
      dataSource: 'ESPN'
    }));
  }

  // Merge fixtures from multiple sources, preferring higher priority sources
  private mergeFixtures(fixtures: DetailedFixture[]): DetailedFixture[] {
    const fixtureMap = new Map<string, DetailedFixture>();
    
    // Group by teams and date to identify same fixtures
    fixtures.forEach(fixture => {
      const key = `${fixture.homeTeam.shortName}-${fixture.awayTeam.shortName}-${fixture.kickoffTime.split('T')[0]}`;
      
      const existing = fixtureMap.get(key);
      if (!existing) {
        fixtureMap.set(key, fixture);
      } else {
        // Prefer fixture with more complete data
        const existingPriority = this.dataSources.find(s => s.name === existing.dataSource)?.priority || 999;
        const newPriority = this.dataSources.find(s => s.name === fixture.dataSource)?.priority || 999;
        
        if (newPriority < existingPriority || 
            (fixture.events.length > existing.events.length) ||
            (fixture.homeScore !== null && existing.homeScore === null)) {
          fixtureMap.set(key, fixture);
        }
      }
    });
    
    return Array.from(fixtureMap.values());
  }

  // Get data source status
  getDataSourceStatus(): any {
    return this.dataSources.map(source => ({
      name: source.name,
      priority: source.priority,
      rateLimit: source.rateLimit,
      configured: source.name === 'Football-Data' ? !!source.apiKey : true,
      recentRequests: this.lastRequests[source.name]?.length || 0
    }));
  }
}

export const multiSourceApi = new MultiSourceDataService();
export type { DetailedFixture, MatchEvent };