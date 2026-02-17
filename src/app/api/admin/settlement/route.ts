import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculatePlayerGameweekPoints } from '@/lib/scoringRules';
import { requireAdminAuth } from '@/lib/requireAdminAuth';
import { fetchPlayerGameweekStats } from '@/lib/fplPlayerStats';

// POST /api/admin/settlement - Calculate and settle gameweek points
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const { gameweek, roomId, forceRecalculate = false } = await request.json();

    if (!gameweek) {
      return NextResponse.json({
        success: false,
        error: 'Gameweek is required'
      }, { status: 400 });
    }

    console.log(`Starting settlement for gameweek ${gameweek}${roomId ? ` in room ${roomId}` : ' (all rooms)'}`);

    const results = {
      gameweek,
      playersProcessed: 0,
      lineupsUpdated: 0,
      totalPointsCalculated: 0,
      errors: [] as string[]
    };

    // Step 1: Get all finished fixtures for the gameweek
    const { data: fixtures, error: fixturesError } = await supabase
      .from('fixtures')
      .select('id, gameweek, home_team_id, away_team_id, finished, home_score, away_score')
      .eq('gameweek', gameweek)
      .eq('finished', true);

    if (fixturesError) throw fixturesError;

    if (!fixtures || fixtures.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No finished fixtures found for gameweek ${gameweek}`
      }, { status: 400 });
    }

    console.log(`Found ${fixtures.length} finished fixtures for gameweek ${gameweek}`);

    // Step 2: Get all lineups for this gameweek
    let lineupsQuery = supabase
      .from('lineups')
      .select(`
        id,
        user_id,
        room_id,
        gameweek,
        captain_id,
        vice_captain_id,
        gameweek_points,
        total_points,
        lineup_players!inner(
          id,
          player_id,
          position,
          is_starter,
          is_captain,
          is_vice_captain,
          multiplier,
          points_scored,
          players!inner(
            id,
            name,
            position,
            team_id,
            fpl_id
          )
        )
      `)
      .eq('gameweek', gameweek)
      .eq('is_submitted', true);

    if (roomId) {
      lineupsQuery = lineupsQuery.eq('room_id', roomId);
    }

    const { data: lineups, error: lineupsError } = await lineupsQuery;

    if (lineupsError) throw lineupsError;

    if (!lineups || lineups.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No submitted lineups found for gameweek ${gameweek}`
      }, { status: 400 });
    }

    console.log(`Found ${lineups.length} lineups to process`);

    // Step 3: Collect all unique fpl_ids and fetch real stats from FPL API
    const allFplIds = new Set<number>();
    for (const lineup of lineups) {
      for (const lp of (lineup as any).lineup_players) {
        const fplId = lp.players?.fpl_id;
        if (fplId) allFplIds.add(fplId);
      }
    }

    console.log(`Fetching FPL stats for ${allFplIds.size} unique players...`);
    const fplStatsMap = await fetchPlayerGameweekStats(Array.from(allFplIds), gameweek);
    console.log(`Got FPL stats for ${fplStatsMap.size} players`);

    // Step 4: Process each lineup — TWO-PASS approach for captain/vc
    for (const lineup of lineups) {
      try {
        console.log(`Processing lineup ${lineup.id} for user ${lineup.user_id}`);

        const lineupPlayers = (lineup as any).lineup_players as any[];

        // --- PASS 1: Calculate base points for all players (no captain multiplier) ---
        const basePointsMap = new Map<string, number>(); // lineupPlayer.id -> base points
        const minutesMap = new Map<string, number>(); // lineupPlayer.id -> minutes played

        for (const lineupPlayer of lineupPlayers) {
          const player = lineupPlayer.players;
          const fplId = player?.fpl_id;

          // Get real minutes from FPL stats (Bug #1 fix)
          let minutesPlayed = 0;
          if (fplId && fplStatsMap.has(fplId)) {
            minutesPlayed = fplStatsMap.get(fplId)!.minutes;
          }
          minutesMap.set(lineupPlayer.id, minutesPlayed);

          // Get player events for this gameweek
          const { data: playerEvents, error: eventsError } = await supabase
            .from('player_events')
            .select('*')
            .eq('player_id', player.id)
            .in('fixture_id', fixtures.map((f: any) => f.id));

          if (eventsError) {
            console.error(`Error fetching events for player ${player.id}:`, eventsError);
            results.errors.push(`Failed to fetch events for player ${player.name}`);
            basePointsMap.set(lineupPlayer.id, 0);
            continue;
          }

          // Calculate base player points (no captain multiplier yet)
          const basePoints = calculatePlayerGameweekPoints(
            playerEvents || [],
            player.position as 'GK' | 'DEF' | 'MID' | 'FWD',
            minutesPlayed
          );

          basePointsMap.set(lineupPlayer.id, basePoints);
          results.playersProcessed++;
        }

        // --- PASS 2: Apply captain/vice-captain multipliers (Bug #3 fix) ---
        // Check if captain actually played
        const captainPlayer = lineupPlayers.find((lp: any) => lp.is_captain);
        const captainMinutes = captainPlayer ? (minutesMap.get(captainPlayer.id) || 0) : 0;
        const captainPlayed = captainMinutes > 0;

        let lineupTotalPoints = 0;
        const playerUpdates: { id: string; points_scored: number }[] = [];

        for (const lineupPlayer of lineupPlayers) {
          const basePoints = basePointsMap.get(lineupPlayer.id) || 0;
          let finalPoints = basePoints;

          if (lineupPlayer.is_captain) {
            finalPoints = basePoints * (lineupPlayer.multiplier || 2);
          } else if (lineupPlayer.is_vice_captain && !captainPlayed) {
            // Vice-captain gets captain bonus ONLY if captain didn't play
            finalPoints = basePoints * 2;
          }

          if (forceRecalculate || lineupPlayer.points_scored !== finalPoints) {
            playerUpdates.push({
              id: lineupPlayer.id,
              points_scored: finalPoints
            });
          }

          lineupTotalPoints += finalPoints;
        }

        // Step 5: Update lineup_players points
        if (playerUpdates.length > 0) {
          for (const update of playerUpdates) {
            const { error: updateError } = await supabase
              .from('lineup_players')
              .update({ points_scored: update.points_scored })
              .eq('id', update.id);

            if (updateError) {
              console.error(`Error updating lineup_player ${update.id}:`, updateError);
              results.errors.push(`Failed to update points for lineup player ${update.id}`);
            }
          }
        }

        // Step 6: Update lineup gameweek_points and total_points separately (Bug #2 fix)
        // First update gameweek_points
        const { error: gwUpdateError } = await supabase
          .from('lineups')
          .update({ gameweek_points: lineupTotalPoints })
          .eq('id', lineup.id);

        if (gwUpdateError) {
          console.error(`Error updating gameweek_points for lineup ${lineup.id}:`, gwUpdateError);
          results.errors.push(`Failed to update gameweek_points for lineup ${lineup.id}`);
        }

        // Then update total_points: old_total - old_gw + new_gw
        const oldGwPoints = lineup.gameweek_points || 0;
        const oldTotal = lineup.total_points || 0;
        const newTotal = oldTotal - oldGwPoints + lineupTotalPoints;

        const { error: totalUpdateError } = await supabase
          .from('lineups')
          .update({ total_points: newTotal })
          .eq('id', lineup.id);

        if (totalUpdateError) {
          console.error(`Error updating total_points for lineup ${lineup.id}:`, totalUpdateError);
          results.errors.push(`Failed to update total_points for lineup ${lineup.id}`);
        } else {
          results.lineupsUpdated++;
          results.totalPointsCalculated += lineupTotalPoints;
        }

      } catch (error: any) {
        console.error(`Error processing lineup ${lineup.id}:`, error);
        results.errors.push(`Failed to process lineup ${lineup.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Settlement completed for gameweek ${gameweek}: ${results.lineupsUpdated} lineups updated, ${results.playersProcessed} players processed`
    });

  } catch (error) {
    console.error('Settlement error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process settlement'
    }, { status: 500 });
  }
}

// GET /api/admin/settlement - Get settlement status for a gameweek
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const gameweek = parseInt(searchParams.get('gameweek') || '1');
    const roomId = searchParams.get('roomId');

    // Get settlement status
    let query = supabase
      .from('lineups')
      .select('id, gameweek_points, total_points, updated_at')
      .eq('gameweek', gameweek)
      .eq('is_submitted', true);

    if (roomId) {
      query = query.eq('room_id', roomId);
    }

    const { data: lineups, error } = await query;

    if (error) throw error;

    // Get fixtures status
    const { data: fixtures, error: fixturesError } = await supabase
      .from('fixtures')
      .select('id, finished')
      .eq('gameweek', gameweek);

    if (fixturesError) throw fixturesError;

    const finishedFixtures = fixtures?.filter(f => f.finished).length || 0;
    const totalFixtures = fixtures?.length || 0;
    const settledLineups = lineups?.filter(l => l.gameweek_points && l.gameweek_points > 0).length || 0;
    const totalLineups = lineups?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        gameweek,
        fixturesFinished: finishedFixtures,
        totalFixtures,
        lineupsSettled: settledLineups,
        totalLineups,
        canSettle: finishedFixtures > 0 && totalLineups > 0,
        allFixturesFinished: finishedFixtures === totalFixtures,
        lastUpdated: lineups?.reduce((latest, lineup) => {
          const updated = new Date(lineup.updated_at);
          return updated > latest ? updated : latest;
        }, new Date(0))?.toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting settlement status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get settlement status'
    }, { status: 500 });
  }
}
