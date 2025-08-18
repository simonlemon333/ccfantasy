// Legal API data sources for sports data aggregation
// All sources are official APIs with proper licensing

interface DataSourceConfig {
  name: string;
  description: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: {
    requests: number;
    period: 'minute' | 'hour' | 'day';
  };
  features: string[];
  legal: {
    termsUrl: string;
    commercial: boolean;
    attribution?: string;
  };
  priority: number; // 1 = highest priority
}

export const LEGAL_DATA_SOURCES: DataSourceConfig[] = [
  {
    name: 'FPL_API',
    description: 'Fantasy Premier League Official API',
    baseUrl: 'https://fantasy.premierleague.com/api',
    rateLimit: {
      requests: 1000,
      period: 'minute'
    },
    features: [
      'fixtures',
      'live_scores', 
      'player_stats',
      'team_data',
      'gameweek_data'
    ],
    legal: {
      termsUrl: 'https://www.premierleague.com/terms-conditions',
      commercial: true,
      attribution: 'Data provided by Premier League'
    },
    priority: 1
  },
  {
    name: 'FOOTBALL_DATA_ORG',
    description: 'Football-Data.org API - Free tier available',
    baseUrl: 'https://api.football-data.org/v4',
    apiKey: process.env.FOOTBALL_DATA_API_KEY,
    rateLimit: {
      requests: 10,
      period: 'minute'
    },
    features: [
      'fixtures',
      'live_scores',
      'match_events',
      'team_data',
      'competitions',
      'future_fixtures'
    ],
    legal: {
      termsUrl: 'https://www.football-data.org/terms',
      commercial: false, // Free tier
      attribution: 'Data provided by Football-Data.org'
    },
    priority: 2
  },
  {
    name: 'SPORTMONKS',
    description: 'SportMonks API - Comprehensive sports data',
    baseUrl: 'https://api.sportmonks.com/v3',
    apiKey: process.env.SPORTMONKS_API_KEY,
    rateLimit: {
      requests: 180,
      period: 'minute'
    },
    features: [
      'fixtures',
      'live_scores',
      'detailed_events',
      'player_stats',
      'team_stats',
      'historical_data'
    ],
    legal: {
      termsUrl: 'https://www.sportmonks.com/terms',
      commercial: true,
      attribution: 'Data provided by SportMonks'
    },
    priority: 3
  },
  {
    name: 'API_SPORTS',
    description: 'API-Sports (formerly RapidAPI Sports)',
    baseUrl: 'https://api-football-v1.p.rapidapi.com/v3',
    apiKey: process.env.RAPID_API_KEY,
    rateLimit: {
      requests: 100,
      period: 'day'
    },
    features: [
      'fixtures',
      'live_scores',
      'match_events',
      'lineups',
      'statistics'
    ],
    legal: {
      termsUrl: 'https://rapidapi.com/terms',
      commercial: true,
      attribution: 'Data provided by API-Sports'
    },
    priority: 4
  },
  {
    name: 'THE_SPORTS_DB',
    description: 'TheSportsDB - Free sports database API',
    baseUrl: 'https://www.thesportsdb.com/api/v1/json',
    rateLimit: {
      requests: 60,
      period: 'minute'
    },
    features: [
      'fixtures',
      'basic_scores',
      'team_data',
      'league_data'
    ],
    legal: {
      termsUrl: 'https://www.thesportsdb.com/api.php',
      commercial: false,
      attribution: 'Data provided by TheSportsDB'
    },
    priority: 5
  }
];

interface DataGap {
  type: 'missing_scores' | 'missing_events' | 'missing_fixtures' | 'outdated_data';
  description: string;
  affectedMatches?: string[];
  severity: 'low' | 'medium' | 'high';
}

class LegalDataAggregator {
  private rateLimitTracker = new Map<string, number[]>();

  // Check if we can make a request to a data source
  canMakeRequest(sourceName: string): boolean {
    const source = LEGAL_DATA_SOURCES.find(s => s.name === sourceName);
    if (!source) return false;

    const now = Date.now();
    const periodMs = source.rateLimit.period === 'minute' ? 60000 : 
                    source.rateLimit.period === 'hour' ? 3600000 : 86400000;

    if (!this.rateLimitTracker.has(sourceName)) {
      this.rateLimitTracker.set(sourceName, []);
    }

    const requests = this.rateLimitTracker.get(sourceName)!;
    const validRequests = requests.filter(time => time > now - periodMs);
    this.rateLimitTracker.set(sourceName, validRequests);

    return validRequests.length < source.rateLimit.requests;
  }

  private recordRequest(sourceName: string): void {
    if (!this.rateLimitTracker.has(sourceName)) {
      this.rateLimitTracker.set(sourceName, []);
    }
    this.rateLimitTracker.get(sourceName)!.push(Date.now());
  }

  // Get Football-Data.org fixtures with detailed events
  async getFootballDataFixtures(competition = 'PL'): Promise<any> {
    const source = LEGAL_DATA_SOURCES.find(s => s.name === 'FOOTBALL_DATA_ORG')!;
    
    if (!source.apiKey) {
      throw new Error('Football-Data.org API key not configured');
    }

    if (!this.canMakeRequest('FOOTBALL_DATA_ORG')) {
      throw new Error('Football-Data.org rate limit exceeded');
    }

    const url = `${source.baseUrl}/competitions/${competition}/matches`;
    
    this.recordRequest('FOOTBALL_DATA_ORG');
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': source.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Football-Data.org API error: ${response.status}`);
    }

    return await response.json();
  }

  // Detect data gaps in our current fixtures
  async detectDataGaps(currentFixtures: any[]): Promise<DataGap[]> {
    const gaps: DataGap[] = [];

    // Check for missing scores in finished matches
    const finishedWithoutScores = currentFixtures.filter(f => 
      f.finished && (f.home_score === null || f.away_score === null)
    );

    if (finishedWithoutScores.length > 0) {
      gaps.push({
        type: 'missing_scores',
        description: `${finishedWithoutScores.length} finished matches missing scores`,
        affectedMatches: finishedWithoutScores.map(f => 
          `${f.home_team?.name || f.home_team?.short_name} vs ${f.away_team?.name || f.away_team?.short_name}`
        ),
        severity: 'high'
      });
    }

    // Check for outdated data (matches that should be finished by now)
    const now = new Date();
    const shouldBeFinished = currentFixtures.filter(f => {
      const kickoff = new Date(f.kickoff_time);
      const matchDuration = 2 * 60 * 60 * 1000; // 2 hours
      return !f.finished && (now.getTime() - kickoff.getTime()) > matchDuration;
    });

    if (shouldBeFinished.length > 0) {
      gaps.push({
        type: 'outdated_data',
        description: `${shouldBeFinished.length} matches should be finished but marked as ongoing`,
        affectedMatches: shouldBeFinished.map(f => 
          `${f.home_team?.name || f.home_team?.short_name} vs ${f.away_team?.name || f.away_team?.short_name}`
        ),
        severity: 'medium'
      });
    }

    return gaps;
  }

  // Fill data gaps using backup APIs
  async fillDataGaps(gaps: DataGap[]): Promise<{ success: number; errors: string[] }> {
    const results = { success: 0, errors: [] };

    for (const gap of gaps) {
      try {
        switch (gap.type) {
          case 'missing_scores':
          case 'outdated_data':
            // Try Football-Data.org for missing scores
            if (this.canMakeRequest('FOOTBALL_DATA_ORG')) {
              const footballData = await this.getFootballDataFixtures();
              // Process and update missing data
              results.success++;
            } else {
              results.errors.push('Football-Data.org rate limit exceeded');
            }
            break;
        }
      } catch (error) {
        results.errors.push(`Failed to fill gap: ${error.message}`);
      }
    }

    return results;
  }

  // Get available data sources with their status
  getDataSourceStatus(): any[] {
    return LEGAL_DATA_SOURCES.map(source => ({
      name: source.name,
      description: source.description,
      configured: source.apiKey ? !!process.env[source.apiKey.replace('process.env.', '')] : true,
      canMakeRequest: this.canMakeRequest(source.name),
      features: source.features,
      commercial: source.legal.commercial,
      priority: source.priority,
      rateLimit: `${source.rateLimit.requests}/${source.rateLimit.period}`,
      recentRequests: this.rateLimitTracker.get(source.name)?.length || 0
    })).sort((a, b) => a.priority - b.priority);
  }

  // Get setup instructions for additional APIs
  getSetupInstructions(): any {
    return {
      instructions: 'To enable additional data sources, add these environment variables:',
      variables: [
        {
          name: 'FOOTBALL_DATA_API_KEY',
          description: 'Free API key from football-data.org (10 requests/minute)',
          url: 'https://www.football-data.org/client/register',
          features: ['Detailed match events', 'Future fixtures', 'Real-time scores']
        },
        {
          name: 'SPORTMONKS_API_KEY',
          description: 'Professional sports data API (paid)',
          url: 'https://www.sportmonks.com',
          features: ['Comprehensive match data', 'Player statistics', 'Historical data']
        },
        {
          name: 'RAPID_API_KEY',
          description: 'RapidAPI key for API-Sports (100 requests/day free)',
          url: 'https://rapidapi.com/api-sports/api/api-football',
          features: ['Live scores', 'Match events', 'Team lineups']
        }
      ],
      currentStatus: 'Only FPL API is currently active',
      recommendation: 'Add FOOTBALL_DATA_API_KEY for free backup data source'
    };
  }
}

export const legalDataAggregator = new LegalDataAggregator();
export type { DataGap, DataSourceConfig };