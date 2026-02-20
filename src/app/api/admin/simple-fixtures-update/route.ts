import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminAuth } from '@/lib/requireAdminAuth';

// POST /api/admin/simple-fixtures-update - Batch upsert all fixtures from FPL
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  if (!supabaseAdmin) {
    return NextResponse.json({
      success: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY not configured. Batch upsert requires admin client.'
    }, { status: 500 });
  }

  try {
    console.log('Starting batch fixtures update...');

    // Fetch FPL fixtures and teams data in parallel
    const [fixturesResponse, teamsResponse] = await Promise.all([
      fetch('https://fantasy.premierleague.com/api/fixtures/'),
      fetch('https://fantasy.premierleague.com/api/bootstrap-static/')
    ]);

    const fplFixtures = await fixturesResponse.json();
    const fplData = await teamsResponse.json();
    const fplTeams = fplData.teams;

    // Create FPL team ID to short_name mapping
    const teamIdToShortName = new Map<number, string>();
    fplTeams.forEach((team: any) => {
      teamIdToShortName.set(team.id, team.short_name);
    });

    console.log(`Fetched ${fplFixtures.length} fixtures, ${teamIdToShortName.size} teams`);

    // Build all fixture records, skipping unknown teams
    let skippedCount = 0;
    const allFixtures = [];

    for (const fplFixture of fplFixtures) {
      const homeTeamShort = teamIdToShortName.get(fplFixture.team_h);
      const awayTeamShort = teamIdToShortName.get(fplFixture.team_a);

      if (!homeTeamShort || !awayTeamShort) {
        skippedCount++;
        continue;
      }

      allFixtures.push({
        id: fplFixture.id,
        gameweek: fplFixture.event || 1,
        home_team: homeTeamShort,
        away_team: awayTeamShort,
        kickoff_time: fplFixture.kickoff_time,
        home_score: fplFixture.team_h_score,
        away_score: fplFixture.team_a_score,
        finished: fplFixture.finished || false,
        minutes_played: fplFixture.finished ? 90 : 0,
        updated_at: new Date().toISOString()
      });
    }

    // Single batch upsert for all fixtures
    console.log(`Batch upserting ${allFixtures.length} fixtures...`);
    const { data: upsertedFixtures, error: upsertError } = await supabaseAdmin
      .from('fixtures')
      .upsert(allFixtures, { onConflict: 'id' })
      .select('id');

    if (upsertError) {
      console.error('Fixture batch upsert error:', upsertError);
      throw new Error(`Fixture upsert failed: ${upsertError.message}`);
    }

    const upsertedCount = upsertedFixtures?.length || 0;
    console.log(`Successfully upserted ${upsertedCount} fixtures`);

    return NextResponse.json({
      success: true,
      data: {
        message: `批量更新完成! ${upsertedCount} 场比赛已同步，跳过 ${skippedCount} 场`,
        insertedFixtures: upsertedCount,
        updatedFixtures: 0,
        skippedFixtures: skippedCount,
        totalProcessed: fplFixtures.length
      }
    });

  } catch (error) {
    console.error('Batch fixtures update failed:', error);
    return NextResponse.json({
      success: false,
      error: `批量更新失败: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}
