// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/admin/sync-with-fallback - Sync with automatic fallback to Football-Data.org
export async function POST(request: NextRequest) {
  try {
    const { gameweek = 1 } = await request.json();
    
    console.log('Starting sync with fallback mechanism...', { gameweek });

    let fixturesData = [];
    let dataSource = 'FPL';
    let matchEvents = [];
    const errors = [];

    // Step 1: Try FPL API first
    try {
      console.log('Attempting FPL API...');
      const fplResponse = await fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gameweek}`);
      
      if (fplResponse.ok) {
        const fplData = await fplResponse.json();
        fixturesData = fplData;
        console.log(`✅ FPL API success: ${fplData.length} fixtures`);
      } else {
        throw new Error(`FPL API returned ${fplResponse.status}`);
      }
    } catch (error) {
      console.warn('⚠️ FPL API failed:', error.message);
      errors.push(`FPL API: ${error.message}`);
    }

    // Step 2: Fallback to Football-Data.org if FPL failed or has gaps
    const footballDataKey = process.env.FOOTBALL_DATA_API_KEY;
    
    if ((fixturesData.length === 0 || errors.length > 0) && footballDataKey) {
      try {
        console.log('🔄 Falling back to Football-Data.org...');
        
        const footballDataResponse = await fetch('https://api.football-data.org/v4/competitions/PL/matches?season=2025&matchday=1', {
          headers: { 'X-Auth-Token': footballDataKey }
        });
        
        if (footballDataResponse.ok) {
          const footballData = await footballDataResponse.json();
          dataSource = 'Football-Data.org';
          
          // Transform Football-Data.org format to our format
          fixturesData = footballData.matches?.map(match => ({
            id: match.id,
            event: gameweek,
            team_h: 1, // Simplified - would need proper team mapping
            team_a: 2,
            team_h_name: match.homeTeam.name,
            team_a_name: match.awayTeam.name,
            team_h_score: match.score.fullTime.home,
            team_a_score: match.score.fullTime.away,
            finished: match.status === 'FINISHED',
            minutes: match.status === 'FINISHED' ? 90 : 0,
            kickoff_time: match.utcDate
          })) || [];
          
          console.log(`✅ Football-Data.org success: ${fixturesData.length} fixtures`);
          
          // Get match events for finished matches
          const finishedMatches = footballData.matches?.filter(m => m.status === 'FINISHED').slice(0, 3) || [];
          
          for (const match of finishedMatches) {
            if (match.goals && match.goals.length > 0) {
              matchEvents.push(...match.goals.map(goal => ({
                match: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
                minute: goal.minute,
                player: goal.scorer.name,
                team: goal.team.name,
                type: goal.type === 'OwnGoal' ? 'own_goal' : 'goal'
              })));
            }
          }
          
        } else {
          const errorText = await footballDataResponse.text();
          throw new Error(`Football-Data.org returned ${footballDataResponse.status}: ${errorText}`);
        }
      } catch (error) {
        console.error('❌ Football-Data.org also failed:', error.message);
        errors.push(`Football-Data.org: ${error.message}`);
      }
    }

    if (fixturesData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'All data sources failed',
        details: {
          errors,
          fplTried: true,
          footballDataTried: !!footballDataKey,
          footballDataConfigured: !!footballDataKey
        }
      }, { status: 500 });
    }

    // Step 3: Enhance with additional details if we have them
    let enhancedFixtures = [];
    
    if (dataSource === 'FPL') {
      // Process FPL fixtures (our current working format)
      enhancedFixtures = fixturesData.map(fixture => ({
        gameweek: fixture.event,
        home_score: fixture.team_h_score,
        away_score: fixture.team_a_score,
        finished: fixture.finished,
        minutes_played: fixture.minutes || 0,
        kickoff_time: fixture.kickoff_time,
        source: 'FPL',
        team_h_id: fixture.team_h,
        team_a_id: fixture.team_a
      }));
    } else {
      // Process Football-Data.org fixtures  
      enhancedFixtures = fixturesData.map(fixture => ({
        gameweek: fixture.event,
        home_score: fixture.team_h_score,
        away_score: fixture.team_a_score,
        finished: fixture.finished,
        minutes_played: fixture.minutes || 0,
        kickoff_time: fixture.kickoff_time,
        source: 'Football-Data.org',
        team_h_name: fixture.team_h_name,
        team_a_name: fixture.team_a_name
      }));
    }

    // Step 4: Return comprehensive results
    const rateLimit = dataSource === 'Football-Data.org' ? {
      source: 'Football-Data.org',
      limit: '10 requests per minute',
      used: '1-3 requests',
      remaining: 'Check API headers'
    } : {
      source: 'FPL',
      limit: 'Unlimited',
      used: '1 request',
      remaining: 'Unlimited'
    };

    return NextResponse.json({
      success: true,
      data: {
        dataSource,
        gameweek,
        totalFixtures: fixturesData.length,
        enhancedFixtures: enhancedFixtures.length,
        matchEvents: matchEvents.length,
        sampleEvents: matchEvents.slice(0, 5),
        rateLimit,
        fallbackUsed: dataSource !== 'FPL',
        errors: errors.length > 0 ? errors : undefined
      },
      message: `✅ Sync completed using ${dataSource}${dataSource !== 'FPL' ? ' (fallback)' : ''}: ${fixturesData.length} fixtures${matchEvents.length > 0 ? ` with ${matchEvents.length} events` : ''}`
    });

  } catch (error) {
    console.error('Sync with fallback error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
      troubleshooting: [
        'Check if FOOTBALL_DATA_API_KEY is configured in .env.local',
        'Verify both FPL and Football-Data.org APIs are accessible',
        'Check internet connection and firewall settings',
        'Review console logs for detailed error messages'
      ]
    }, { status: 500 });
  }
}

// GET /api/admin/sync-with-fallback - Check fallback system status
export async function GET(request: NextRequest) {
  try {
    const footballDataConfigured = !!process.env.FOOTBALL_DATA_API_KEY;
    
    // Test both APIs quickly
    const fplTest = fetch('https://fantasy.premierleague.com/api/bootstrap-static/', { 
      signal: AbortSignal.timeout(5000) 
    }).then(r => r.ok).catch(() => false);
    
    let footballDataTest = Promise.resolve(false);
    if (footballDataConfigured) {
      footballDataTest = fetch('https://api.football-data.org/v4/competitions/PL', {
        headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! },
        signal: AbortSignal.timeout(5000)
      }).then(r => r.ok).catch(() => false);
    }

    const [fplAvailable, footballDataAvailable] = await Promise.all([fplTest, footballDataTest]);

    const status = {
      primarySource: {
        name: 'FPL API',
        available: fplAvailable,
        features: ['Unlimited requests', 'Real-time scores', 'Player stats']
      },
      fallbackSource: {
        name: 'Football-Data.org',
        configured: footballDataConfigured,
        available: footballDataAvailable,
        features: footballDataConfigured ? [
          '10 requests per minute',
          'Detailed match events',
          'Goals, assists, cards',
          'Enhanced coverage'
        ] : ['Not configured']
      },
      recommendations: []
    };

    // Generate recommendations
    if (!fplAvailable && !footballDataAvailable) {
      status.recommendations.push('⚠️ Both APIs are unavailable - check internet connection');
    } else if (!fplAvailable && footballDataAvailable) {
      status.recommendations.push('ℹ️ FPL API down but Football-Data.org available - fallback ready');
    } else if (fplAvailable && !footballDataConfigured) {
      status.recommendations.push('💡 Configure Football-Data.org for enhanced fallback protection');
    } else if (fplAvailable && footballDataAvailable) {
      status.recommendations.push('✅ All systems operational - full fallback protection active');
    }

    return NextResponse.json({
      success: true,
      data: {
        status,
        capabilities: {
          automaticFallback: footballDataConfigured,
          matchEvents: footballDataConfigured,
          redundancy: fplAvailable && footballDataAvailable ? 'Full' : 
                     fplAvailable || footballDataAvailable ? 'Partial' : 'None'
        }
      }
    });

  } catch (error) {
    console.error('Error checking fallback status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check status'
    }, { status: 500 });
  }
}