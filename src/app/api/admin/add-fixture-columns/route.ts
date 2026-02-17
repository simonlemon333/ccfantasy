// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/requireAdminAuth';

// POST /api/admin/add-fixture-columns - Add team name columns and update data
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  try {
    console.log('Adding team name columns to fixtures and updating data...');

    // First, let's get current fixtures to see the structure
    const { data: sampleFixtures, error: sampleError } = await supabase
      .from('fixtures')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('Error fetching sample fixtures:', sampleError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch sample fixtures'
      }, { status: 500 });
    }

    console.log('Sample fixture structure:', sampleFixtures?.[0]);

    // Get all teams for mapping
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, short_name');

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch teams'
      }, { status: 500 });
    }

    console.log(`Found ${teams?.length} teams`);

    // Get all fixtures
    const { data: fixtures, error: fixturesError } = await supabase
      .from('fixtures')
      .select('id, home_team_id, away_team_id');

    if (fixturesError) {
      console.error('Error fetching fixtures:', fixturesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch fixtures'
      }, { status: 500 });
    }

    console.log(`Found ${fixtures?.length} fixtures to process`);

    // Create team lookup
    const teamMap = new Map();
    teams?.forEach(team => {
      teamMap.set(team.id, team);
    });

    let updatedCount = 0;
    const errors = [];

    // For now, let's just try to get the fixtures with team names via joins
    const { data: detailedFixtures, error: detailedError } = await supabase
      .from('fixtures')
      .select(`
        id,
        gameweek,
        home_team_id,
        away_team_id,
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

    return NextResponse.json({
      success: true,
      data: {
        sampleFixture: sampleFixtures?.[0],
        totalTeams: teams?.length || 0,
        totalFixtures: fixtures?.length || 0,
        detailedFixtures: detailedError ? null : detailedFixtures?.slice(0, 5),
        joinError: detailedError?.message,
        message: detailedError 
          ? 'Need to add team name columns to fixtures table - run scripts/06_add_team_names_to_fixtures.sql in Supabase SQL Editor'
          : 'Fixtures can be read with team names via joins'
      }
    });

  } catch (error) {
    console.error('Add fixture columns error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add fixture columns'
    }, { status: 500 });
  }
}