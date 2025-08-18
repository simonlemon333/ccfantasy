import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/admin/update-fixture-names - Update fixtures with team names
export async function POST(request: NextRequest) {
  try {
    console.log('Starting fixture names update...');

    // Get all fixtures
    const { data: fixtures, error: fixturesError } = await supabase
      .from('fixtures')
      .select('id, home_team_id, away_team_id, home_team_name, away_team_name');

    if (fixturesError) {
      console.error('Error fetching fixtures:', fixturesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch fixtures'
      }, { status: 500 });
    }

    // Get all teams
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

    // Create team lookup map
    const teamMap = new Map();
    teams?.forEach(team => {
      teamMap.set(team.id, {
        name: team.name,
        short_name: team.short_name
      });
    });

    let updatedCount = 0;
    const errors = [];

    // Update each fixture with team names
    for (const fixture of fixtures || []) {
      try {
        const homeTeam = teamMap.get(fixture.home_team_id);
        const awayTeam = teamMap.get(fixture.away_team_id);

        // Skip if names already exist
        if (fixture.home_team_name && fixture.away_team_name) {
          continue;
        }

        const updates: any = {};

        if (homeTeam && !fixture.home_team_name) {
          updates.home_team_name = homeTeam.name;
          updates.home_team_short_name = homeTeam.short_name;
        }

        if (awayTeam && !fixture.away_team_name) {
          updates.away_team_name = awayTeam.name;
          updates.away_team_short_name = awayTeam.short_name;
        }

        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('fixtures')
            .update(updates)
            .eq('id', fixture.id);

          if (updateError) {
            console.error(`Error updating fixture ${fixture.id}:`, updateError);
            errors.push(`Failed to update fixture ${fixture.id}: ${updateError.message}`);
          } else {
            updatedCount++;
            console.log(`Updated fixture: ${homeTeam?.name || 'Unknown'} vs ${awayTeam?.name || 'Unknown'}`);
          }
        }

      } catch (error) {
        console.error(`Error processing fixture ${fixture.id}:`, error);
        errors.push(`Error processing fixture ${fixture.id}: ${error.message}`);
      }
    }

    // Get updated statistics
    const { data: updatedFixtures } = await supabase
      .from('fixtures')
      .select('home_team_name, away_team_name')
      .not('home_team_name', 'is', null)
      .not('away_team_name', 'is', null);

    return NextResponse.json({
      success: true,
      data: {
        totalFixtures: fixtures?.length || 0,
        totalTeams: teams?.length || 0,
        updatedFixtures: updatedCount,
        fixturesWithNames: updatedFixtures?.length || 0,
        errors
      },
      message: `Updated ${updatedCount} fixtures with team names`
    });

  } catch (error) {
    console.error('Fixture names update error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update fixture names'
    }, { status: 500 });
  }
}

// GET /api/admin/update-fixture-names - Check fixture names status
export async function GET(request: NextRequest) {
  try {
    // Get fixtures with and without names
    const { data: allFixtures } = await supabase
      .from('fixtures')
      .select('id, home_team_name, away_team_name, home_team_id, away_team_id');

    const { data: fixturesWithNames } = await supabase
      .from('fixtures')
      .select('id')
      .not('home_team_name', 'is', null)
      .not('away_team_name', 'is', null);

    const { data: teams } = await supabase
      .from('teams')
      .select('count', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      data: {
        totalFixtures: allFixtures?.length || 0,
        fixturesWithNames: fixturesWithNames?.length || 0,
        fixturesNeedingNames: (allFixtures?.length || 0) - (fixturesWithNames?.length || 0),
        totalTeams: teams?.count || 0,
        sampleFixtures: allFixtures?.slice(0, 5).map(f => ({
          id: f.id,
          homeTeam: f.home_team_name || f.home_team_id,
          awayTeam: f.away_team_name || f.away_team_id,
          hasNames: !!(f.home_team_name && f.away_team_name)
        }))
      }
    });

  } catch (error) {
    console.error('Error checking fixture names:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check fixture names'
    }, { status: 500 });
  }
}