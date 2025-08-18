import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { legalDataAggregator } from '@/lib/legalDataSources';

// GET /api/admin/data-sources - Check data source status and gaps
export async function GET(request: NextRequest) {
  try {
    console.log('Checking data sources and gaps...');

    // Get current fixtures to analyze gaps
    const { data: fixtures, error: fixturesError } = await supabase
      .from('fixtures')
      .select(`
        id,
        gameweek,
        home_score,
        away_score,
        finished,
        minutes_played,
        kickoff_time,
        updated_at,
        home_team:teams!fixtures_home_team_id_fkey(name, short_name),
        away_team:teams!fixtures_away_team_id_fkey(name, short_name)
      `)
      .order('kickoff_time', { ascending: false });

    if (fixturesError) {
      throw new Error(`Failed to fetch fixtures: ${fixturesError.message}`);
    }

    // Detect data gaps
    const dataGaps = await legalDataAggregator.detectDataGaps(fixtures || []);
    
    // Get data source status
    const dataSourceStatus = legalDataAggregator.getDataSourceStatus();
    
    // Get setup instructions
    const setupInstructions = legalDataAggregator.getSetupInstructions();

    // Analyze current data quality
    const analysis = {
      totalFixtures: fixtures?.length || 0,
      finishedFixtures: fixtures?.filter(f => f.finished).length || 0,
      fixturesWithScores: fixtures?.filter(f => f.home_score !== null && f.away_score !== null).length || 0,
      incompleteData: fixtures?.filter(f => f.finished && (f.home_score === null || f.away_score === null)).length || 0,
      recentlyUpdated: fixtures?.filter(f => {
        const updated = new Date(f.updated_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return updated > oneHourAgo;
      }).length || 0
    };

    // Generate recommendations
    const recommendations = [];
    
    if (dataGaps.find(g => g.type === 'missing_scores')) {
      recommendations.push({
        priority: 'high',
        action: 'Add Football-Data.org API key',
        reason: 'Missing scores in finished matches',
        solution: 'FOOTBALL_DATA_API_KEY provides free backup data for scores'
      });
    }

    if (dataGaps.find(g => g.type === 'outdated_data')) {
      recommendations.push({
        priority: 'medium',
        action: 'Set up automatic sync',
        reason: 'Match data not updated in real-time',
        solution: 'Schedule regular API calls during match days'
      });
    }

    if (analysis.totalFixtures < 10) {
      recommendations.push({
        priority: 'medium',
        action: 'Add future fixtures',
        reason: 'Limited fixture coverage',
        solution: 'Fetch upcoming gameweeks from FPL or Football-Data.org APIs'
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        dataGaps,
        dataSourceStatus,
        setupInstructions,
        recommendations,
        currentFixtures: fixtures?.slice(0, 5).map(f => ({
          match: `${f.home_team?.short_name} vs ${f.away_team?.short_name}`,
          score: f.home_score !== null && f.away_score !== null ? `${f.home_score}-${f.away_score}` : 'TBD',
          status: f.finished ? '已结束' : '未开始',
          dataComplete: f.finished ? (f.home_score !== null && f.away_score !== null) : true
        }))
      }
    });

  } catch (error) {
    console.error('Data sources check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check data sources'
    }, { status: 500 });
  }
}

// POST /api/admin/data-sources - Fill data gaps using backup APIs
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    console.log(`Executing data source action: ${action}`);

    switch (action) {
      case 'fill_gaps':
        // Get current fixtures
        const { data: fixtures } = await supabase
          .from('fixtures')
          .select('*');

        // Detect gaps
        const gaps = await legalDataAggregator.detectDataGaps(fixtures || []);
        
        // Try to fill gaps
        const fillResult = await legalDataAggregator.fillDataGaps(gaps);
        
        return NextResponse.json({
          success: true,
          data: {
            gapsDetected: gaps.length,
            gapsFilled: fillResult.success,
            errors: fillResult.errors
          },
          message: `Attempted to fill ${gaps.length} data gaps, ${fillResult.success} successful`
        });

      case 'test_apis':
        // Test all configured APIs
        const testResults = [];
        
        const sources = legalDataAggregator.getDataSourceStatus();
        for (const source of sources.filter(s => s.configured && s.canMakeRequest)) {
          try {
            if (source.name === 'FOOTBALL_DATA_ORG') {
              // Test Football-Data.org
              const result = await legalDataAggregator.getFootballDataFixtures();
              testResults.push({
                source: source.name,
                success: true,
                message: `Retrieved ${result.matches?.length || 0} matches`
              });
            }
          } catch (error) {
            testResults.push({
              source: source.name,
              success: false,
              error: error.message
            });
          }
        }

        return NextResponse.json({
          success: true,
          data: { testResults }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Data source action error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute data source action'
    }, { status: 500 });
  }
}