import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/test-football-data - Test Football-Data.org API directly
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'FOOTBALL_DATA_API_KEY not configured',
        instructions: [
          '1. Add FOOTBALL_DATA_API_KEY=9f2bbbb7286a4da3b60317b43a6ffe81 to .env.local',
          '2. Restart the development server (pnpm dev)',
          '3. Try this API again'
        ]
      }, { status: 400 });
    }

    console.log('Testing Football-Data.org API...');
    console.log('API Key configured:', apiKey.substring(0, 10) + '...');

    // Test API connection with Premier League competition
    const response = await fetch('https://api.football-data.org/v4/competitions/PL/matches?limit=5', {
      headers: {
        'X-Auth-Token': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `API Error: ${response.status} ${response.statusText}`,
        details: errorText,
        apiKey: apiKey.substring(0, 10) + '...'
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Get recent matches for display
    const recentMatches = data.matches?.slice(0, 3).map(match => ({
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      score: match.score.fullTime.home !== null ? 
        `${match.score.fullTime.home}-${match.score.fullTime.away}` : 'TBD',
      status: match.status,
      date: new Date(match.utcDate).toLocaleDateString('zh-CN')
    }));

    return NextResponse.json({
      success: true,
      data: {
        apiKey: apiKey.substring(0, 10) + '...',
        competition: data.competition?.name,
        season: data.competition?.currentSeason?.currentMatchday,
        totalMatches: data.count,
        recentMatches,
        rateLimit: {
          limit: '10 requests per minute',
          remaining: response.headers.get('X-Requests-Available-Minute'),
          resetTime: 'Every minute'
        }
      },
      message: '🎉 Football-Data.org API working perfectly!'
    });

  } catch (error) {
    console.error('Football-Data API test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'API test failed',
      troubleshooting: [
        'Check if FOOTBALL_DATA_API_KEY is set in .env.local',
        'Restart development server after adding environment variable',
        'Verify API key is correct: 9f2bbbb7286a4da3b60317b43a6ffe81',
        'Check internet connection'
      ]
    }, { status: 500 });
  }
}

// POST /api/admin/test-football-data - Get detailed match events
export async function POST(request: NextRequest) {
  try {
    const { matchId } = await request.json();
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'FOOTBALL_DATA_API_KEY not configured'
      }, { status: 400 });
    }

    // Get match details with events if matchId provided
    let url = 'https://api.football-data.org/v4/competitions/PL/matches?status=FINISHED&limit=1';
    if (matchId) {
      url = `https://api.football-data.org/v4/matches/${matchId}`;
    }

    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract match events if available
    const match = matchId ? data : data.matches?.[0];
    const events = [];
    
    if (match && match.goals) {
      match.goals.forEach(goal => {
        events.push({
          minute: goal.minute,
          type: goal.type === 'OwnGoal' ? 'own_goal' : 'goal',
          player: goal.scorer.name,
          team: goal.team.name
        });
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        match: match ? {
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          score: `${match.score.fullTime.home}-${match.score.fullTime.away}`,
          status: match.status,
          date: new Date(match.utcDate).toLocaleDateString('zh-CN')
        } : null,
        events,
        eventTypes: ['goal', 'own_goal', 'yellow_card', 'red_card']
      },
      message: events.length > 0 ? 
        `Found ${events.length} match events` : 
        'Match found but no detailed events available'
    });

  } catch (error) {
    console.error('Football-Data detailed test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get match details'
    }, { status: 500 });
  }
}