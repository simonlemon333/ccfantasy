// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/requireAdminAuth';
import { fetchPlayerGameweekStats } from '@/lib/fplPlayerStats';

// POST /api/admin/populate-player-events - Populate player events from real FPL data
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json().catch(() => ({}));
    const targetGameweek = body.gameweek;

    console.log('Starting player_events population from FPL data...');

    // Get finished fixtures, optionally filtered by gameweek
    let fixturesQuery = supabase
      .from('fixtures')
      .select('id, gameweek, home_team, away_team, home_score, away_score')
      .eq('finished', true)
      .order('gameweek');

    if (targetGameweek) {
      fixturesQuery = fixturesQuery.eq('gameweek', targetGameweek);
    } else {
      fixturesQuery = fixturesQuery.limit(10);
    }

    const { data: finishedFixtures, error: fixturesError } = await fixturesQuery;

    if (fixturesError) {
      throw new Error(`Failed to fetch fixtures: ${fixturesError.message}`);
    }

    console.log(`Found ${finishedFixtures?.length || 0} finished fixtures`);

    // Get all players with fpl_id
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, team, position, fpl_id');

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    // Build team -> players map
    const playersByTeam = new Map<string, typeof players>();
    for (const player of players || []) {
      const teamPlayers = playersByTeam.get(player.team) || [];
      teamPlayers.push(player);
      playersByTeam.set(player.team, teamPlayers);
    }

    // Collect unique gameweeks from fixtures
    const gameweeks = [...new Set((finishedFixtures || []).map(f => f.gameweek))];

    let totalEventsCreated = 0;
    const processedMatches = [];

    for (const gw of gameweeks) {
      const gwFixtures = finishedFixtures!.filter(f => f.gameweek === gw);

      // Get all involved teams' players with fpl_ids
      const involvedTeams = new Set<string>();
      for (const fixture of gwFixtures) {
        if (fixture.home_team) involvedTeams.add(fixture.home_team);
        if (fixture.away_team) involvedTeams.add(fixture.away_team);
      }

      const involvedPlayers = (players || []).filter(
        p => p.fpl_id && involvedTeams.has(p.team)
      );

      if (involvedPlayers.length === 0) continue;

      // Fetch real FPL stats for these players
      const fplIds = involvedPlayers.map(p => p.fpl_id!);
      const statsMap = await fetchPlayerGameweekStats(fplIds, gw);

      // Delete existing events for these fixtures to avoid duplicates
      const fixtureIds = gwFixtures.map(f => f.id);
      await supabase
        .from('player_events')
        .delete()
        .in('fixture_id', fixtureIds);

      // Generate events from real FPL stats
      for (const fixture of gwFixtures) {
        const matchEvents = [];

        const homePlayers = (playersByTeam.get(fixture.home_team) || []).filter(p => p.fpl_id);
        const awayPlayers = (playersByTeam.get(fixture.away_team) || []).filter(p => p.fpl_id);
        const allMatchPlayers = [...homePlayers, ...awayPlayers];

        for (const player of allMatchPlayers) {
          const stats = statsMap.get(player.fpl_id!);
          if (!stats || stats.minutes === 0) continue;

          // Goals
          for (let i = 0; i < stats.goals_scored; i++) {
            const goalPoints = player.position === 'GK' || player.position === 'DEF' ? 6
              : player.position === 'MID' ? 5 : 4;
            matchEvents.push({
              fixture_id: fixture.id,
              player_id: player.id,
              event_type: 'goal',
              points: goalPoints,
            });
          }

          // Assists
          for (let i = 0; i < stats.assists; i++) {
            matchEvents.push({
              fixture_id: fixture.id,
              player_id: player.id,
              event_type: 'assist',
              points: 3,
            });
          }

          // Clean sheets
          if (stats.clean_sheets > 0) {
            const csPoints = player.position === 'GK' || player.position === 'DEF' ? 4
              : player.position === 'MID' ? 1 : 0;
            if (csPoints > 0) {
              matchEvents.push({
                fixture_id: fixture.id,
                player_id: player.id,
                event_type: 'clean_sheet',
                points: csPoints,
              });
            }
          }

          // Yellow cards
          for (let i = 0; i < stats.yellow_cards; i++) {
            matchEvents.push({
              fixture_id: fixture.id,
              player_id: player.id,
              event_type: 'yellow_card',
              points: -1,
            });
          }

          // Red cards
          for (let i = 0; i < stats.red_cards; i++) {
            matchEvents.push({
              fixture_id: fixture.id,
              player_id: player.id,
              event_type: 'red_card',
              points: -3,
            });
          }

          // Own goals
          for (let i = 0; i < stats.own_goals; i++) {
            matchEvents.push({
              fixture_id: fixture.id,
              player_id: player.id,
              event_type: 'own_goal',
              points: -2,
            });
          }

          // Penalties missed
          for (let i = 0; i < stats.penalties_missed; i++) {
            matchEvents.push({
              fixture_id: fixture.id,
              player_id: player.id,
              event_type: 'penalty_miss',
              points: -2,
            });
          }

          // Bonus points
          if (stats.bonus > 0) {
            matchEvents.push({
              fixture_id: fixture.id,
              player_id: player.id,
              event_type: 'bonus',
              points: stats.bonus,
            });
          }

          // Saves (GK only, 1 point per 3 saves)
          if (player.position === 'GK' && stats.saves >= 3) {
            matchEvents.push({
              fixture_id: fixture.id,
              player_id: player.id,
              event_type: 'save',
              points: Math.floor(stats.saves / 3),
            });
          }
        }

        // Insert events
        if (matchEvents.length > 0) {
          const { error: insertError } = await supabase
            .from('player_events')
            .insert(matchEvents);

          if (insertError) {
            console.error(`Failed to insert events for fixture ${fixture.id}:`, insertError);
          } else {
            totalEventsCreated += matchEvents.length;
            processedMatches.push({
              match: `${fixture.home_team} vs ${fixture.away_team}`,
              events: matchEvents.length,
              gameweek: fixture.gameweek
            });
          }
        }
      }
    }

    // Get final stats
    const { count: totalEvents } = await supabase
      .from('player_events')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      data: {
        totalEventsCreated,
        processedMatches: processedMatches.length,
        matchDetails: processedMatches,
        totalEventsInDatabase: totalEvents,
      },
      message: `Created ${totalEventsCreated} player events from real FPL data across ${processedMatches.length} matches`
    });

  } catch (error) {
    console.error('populate-player-events error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to populate events',
    }, { status: 500 });
  }
}

// GET /api/admin/populate-player-events - Check current player_events status
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const { count: totalEvents } = await supabase
      .from('player_events')
      .select('*', { count: 'exact', head: true });

    const { data: sampleEvents } = await supabase
      .from('player_events')
      .select('*')
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        totalEvents,
        sampleEvents,
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Check failed'
    }, { status: 500 });
  }
}
