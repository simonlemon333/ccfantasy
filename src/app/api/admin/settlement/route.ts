// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculatePlayerGameweekPoints } from '@/lib/scoringRules';

// POST /api/admin/settlement - Calculate and settle gameweek points
export async function POST(request: NextRequest) {
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
      errors: []
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
            team_id
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

    // Step 3: Process each lineup
    for (const lineup of lineups) {
      try {
        console.log(`Processing lineup ${lineup.id} for user ${lineup.user_id}`);

        let lineupTotalPoints = 0;
        const playerUpdates = [];

        // Process each player in the lineup
        for (const lineupPlayer of lineup.lineup_players) {
          const player = lineupPlayer.players;
          
          console.log(`Processing player ${player.name} (${player.position})`);

          // Get player events for this gameweek
          const { data: playerEvents, error: eventsError } = await supabase
            .from('player_events')
            .select('*')
            .eq('player_id', player.id)
            .in('fixture_id', fixtures.map(f => f.id));

          if (eventsError) {
            console.error(`Error fetching events for player ${player.id}:`, eventsError);
            results.errors.push(`Failed to fetch events for player ${player.name}`);
            continue;
          }

          // Calculate player points for this gameweek
          const playerPoints = calculatePlayerGameweekPoints(
            playerEvents || [],
            player.position as 'GK' | 'DEF' | 'MID' | 'FWD',
            60 // TODO: Get actual minutes played from events
          );

          // Apply captain/vice-captain multiplier
          let finalPoints = playerPoints;
          if (lineupPlayer.is_captain) {
            finalPoints *= lineupPlayer.multiplier || 2;
          } else if (lineupPlayer.is_vice_captain && !lineup.lineup_players.some(lp => lp.is_captain && lp.points_scored > 0)) {
            // Vice-captain gets captain bonus if captain didn't play
            finalPoints *= 2;
          }

          // Only update if points changed or force recalculate
          if (forceRecalculate || lineupPlayer.points_scored !== finalPoints) {
            playerUpdates.push({
              id: lineupPlayer.id,
              points_scored: finalPoints
            });
          }

          lineupTotalPoints += finalPoints;
          results.playersProcessed++;
        }

        // Step 4: Update lineup_players points
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

        // Step 5: Update lineup total points
        const { error: lineupUpdateError } = await supabase
          .from('lineups')
          .update({ 
            gameweek_points: lineupTotalPoints,
            total_points: supabase.rpc('increment_total_points', { 
              lineup_id: lineup.id, 
              points_to_add: lineupTotalPoints - (lineup.gameweek_points || 0)
            })
          })
          .eq('id', lineup.id);

        if (lineupUpdateError) {
          console.error(`Error updating lineup ${lineup.id}:`, lineupUpdateError);
          results.errors.push(`Failed to update lineup ${lineup.id}`);
        } else {
          results.lineupsUpdated++;
          results.totalPointsCalculated += lineupTotalPoints;
        }

      } catch (error) {
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