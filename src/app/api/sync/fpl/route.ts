import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';
import { fplApi } from '@/lib/fplApi';
import { requireAdminAuth } from '@/lib/requireAdminAuth';

// POST /api/sync/fpl - Sync player data from FPL API (batch upsert)
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
    console.log('Starting FPL data sync (batch mode)...');

    const fplPlayers = await fplApi.getAllPlayers();
    const fplTeams = await fplApi.getAllTeams();

    console.log(`Fetched ${fplPlayers.length} players and ${fplTeams.length} teams from FPL API`);

    // Build all player records for batch upsert
    const allPlayers = fplPlayers.map(fplPlayer => {
      const playerName = `${fplPlayer.first_name} ${fplPlayer.second_name}`;
      const position = fplApi.convertPosition(fplPlayer.element_type);
      const price = fplApi.convertPrice(fplPlayer.now_cost);
      const teamShortName = fplApi.getTeamShortName(fplPlayer.team);
      const photoUrl = fplApi.getPlayerPhotoUrl(fplPlayer.photo);

      return {
        fpl_id: fplPlayer.id,
        name: playerName,
        position,
        team: teamShortName,
        price,
        total_points: fplPlayer.total_points,
        form: parseFloat(fplPlayer.form) || 0,
        selected_by_percent: parseFloat(fplPlayer.selected_by_percent) || 0,
        goals: fplPlayer.goals_scored,
        assists: fplPlayer.assists,
        clean_sheets: fplPlayer.clean_sheets,
        yellow_cards: fplPlayer.yellow_cards,
        red_cards: fplPlayer.red_cards,
        saves: fplPlayer.saves,
        bonus_points: fplPlayer.bonus,
        photo_url: photoUrl,
        is_available: true,
        updated_at: new Date().toISOString()
      };
    });

    // Batch upsert all players in one call (uses fpl_id unique index)
    console.log(`Batch upserting ${allPlayers.length} players...`);
    const { data: upsertedPlayers, error: playerError } = await supabaseAdmin
      .from('players')
      .upsert(allPlayers, { onConflict: 'fpl_id' })
      .select('id');

    if (playerError) {
      console.error('Player batch upsert error:', playerError);
      throw new Error(`Player upsert failed: ${playerError.message}`);
    }

    const playersCount = upsertedPlayers?.length || 0;
    console.log(`Successfully upserted ${playersCount} players`);

    // Sync fixtures for current and nearby gameweeks
    const currentGameweek = await fplApi.getCurrentGameweek();
    let fixturesCount = 0;
    const gameweeksToSync = [currentGameweek - 1, currentGameweek, currentGameweek + 1].filter(gw => gw >= 1 && gw <= 38);

    console.log(`Syncing fixtures for gameweeks: ${gameweeksToSync.join(', ')}`);

    // Collect all fixtures across gameweeks
    const allFixtures = [];
    for (const gw of gameweeksToSync) {
      try {
        const fplFixtures = await fplApi.getFixtures(gw);
        for (const fplFixture of fplFixtures) {
          allFixtures.push({
            id: fplFixture.id,
            gameweek: fplFixture.event,
            home_team: fplApi.getTeamShortName(fplFixture.team_h),
            away_team: fplApi.getTeamShortName(fplFixture.team_a),
            kickoff_time: fplFixture.kickoff_time,
            home_score: fplFixture.team_h_score || null,
            away_score: fplFixture.team_a_score || null,
            finished: fplFixture.finished,
            minutes_played: fplFixture.minutes
          });
        }
      } catch (error) {
        console.error(`Error fetching fixtures for gameweek ${gw}:`, error);
      }
    }

    // Batch upsert all fixtures in one call
    if (allFixtures.length > 0) {
      console.log(`Batch upserting ${allFixtures.length} fixtures...`);
      const { data: upsertedFixtures, error: fixtureError } = await supabaseAdmin
        .from('fixtures')
        .upsert(allFixtures, { onConflict: 'id' })
        .select('id');

      if (fixtureError) {
        console.error('Fixture batch upsert error:', fixtureError);
      } else {
        fixturesCount = upsertedFixtures?.length || 0;
        console.log(`Successfully upserted ${fixturesCount} fixtures`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        playersUpserted: playersCount,
        totalFplPlayers: fplPlayers.length,
        fixturesSynced: fixturesCount,
        currentGameweek
      },
      message: `Sync completed: ${playersCount} players upserted, ${fixturesCount} fixtures synced`
    });

  } catch (error) {
    console.error('FPL sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync FPL data'
    }, { status: 500 });
  }
}

// GET /api/sync/fpl - Get sync status
export async function GET() {
  try {
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });

    const { data: samplePlayer } = await supabase
      .from('players')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        totalPlayers: count,
        lastUpdated: samplePlayer?.updated_at,
        syncAvailable: true
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get sync status'
    }, { status: 500 });
  }
}
