import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/debug/database - Debug database state
export async function GET() {
  try {
    console.log('Running database diagnostics...');

    // Get teams info
    const { data: teams, count: teamsCount } = await supabase
      .from('teams')
      .select('*', { count: 'exact' });

    // Get players info
    const { data: players, count: playersCount } = await supabase
      .from('players')
      .select('name, position, team_id, price, total_points', { count: 'exact' })
      .limit(5);

    // Get fixtures info
    const { data: fixtures, count: fixturesCount } = await supabase
      .from('fixtures')
      .select('gameweek, home_team_id, away_team_id, finished', { count: 'exact' })
      .limit(5);

    // Check for team mapping issues
    const { data: playersWithoutTeams } = await supabase
      .from('players')
      .select('id, name, team_id')
      .is('team_id', null)
      .limit(5);

    // Check fixture team references
    const { data: fixturesWithInvalidTeams } = await supabase
      .from('fixtures')
      .select(`
        id,
        gameweek,
        home_team_id,
        away_team_id,
        home_team:home_team_id(name),
        away_team:away_team_id(name)
      `)
      .limit(5);

    // Sample player with team info
    const { data: samplePlayersWithTeams } = await supabase
      .from('players')
      .select(`
        name,
        position,
        price,
        teams(name, short_name)
      `)
      .not('team_id', 'is', null)
      .limit(5);

    const diagnostics = {
      database_status: {
        teams: {
          count: teamsCount,
          sample: teams?.slice(0, 3)
        },
        players: {
          count: playersCount,
          sample: players,
          without_teams: playersWithoutTeams?.length || 0
        },
        fixtures: {
          count: fixturesCount,
          sample: fixtures,
          sample_with_teams: fixturesWithInvalidTeams
        }
      },
      data_quality: {
        players_without_teams: playersWithoutTeams,
        sample_players_with_teams: samplePlayersWithTeams
      },
      recommendations: []
    };

    // Add recommendations
    if (teamsCount === 0) {
      diagnostics.recommendations.push('❌ 没有球队数据 - 需要先同步球队');
    }
    
    if (playersCount < 100) {
      diagnostics.recommendations.push('⚠️ 球员数据不足 - 建议执行全量同步');
    }
    
    if (fixturesCount === 0) {
      diagnostics.recommendations.push('❌ 没有赛程数据 - 需要同步赛程');
    }
    
    if (playersWithoutTeams && playersWithoutTeams.length > 0) {
      diagnostics.recommendations.push('⚠️ 有球员没有关联球队 - 球队映射可能有问题');
    }

    if (diagnostics.recommendations.length === 0) {
      diagnostics.recommendations.push('✅ 数据库状态正常');
    }

    return NextResponse.json({
      success: true,
      data: diagnostics
    });

  } catch (error) {
    console.error('Database diagnostics error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run diagnostics'
    }, { status: 500 });
  }
}