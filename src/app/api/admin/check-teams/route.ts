import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/admin/check-teams - Check current teams in database
export async function GET(request: NextRequest) {
  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('id, name, short_name')
      .order('short_name');

    if (error) throw error;

    // Also check fixtures to see what teams are actually referenced
    const { data: fixtures, error: fixturesError } = await supabase
      .from('fixtures')
      .select(`
        home_team:teams!fixtures_home_team_id_fkey(short_name, name),
        away_team:teams!fixtures_away_team_id_fkey(short_name, name)
      `)
      .limit(20);

    if (fixturesError) throw fixturesError;

    // Extract unique teams from fixtures
    const teamsInFixtures = new Set();
    fixtures?.forEach(f => {
      if (f.home_team?.short_name) teamsInFixtures.add(f.home_team.short_name);
      if (f.away_team?.short_name) teamsInFixtures.add(f.away_team.short_name);
    });

    return NextResponse.json({
      success: true,
      data: {
        totalTeamsInDatabase: teams?.length || 0,
        teams: teams?.map(t => ({ name: t.name, short_name: t.short_name })),
        teamsInFixtures: Array.from(teamsInFixtures).sort(),
        missingFromFixtures: teams?.filter(t => !teamsInFixtures.has(t.short_name)).map(t => t.short_name)
      }
    });

  } catch (error) {
    console.error('Error checking teams:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Check failed'
    }, { status: 500 });
  }
}