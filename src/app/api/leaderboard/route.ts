import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/leaderboard - Get leaderboard for room/gameweek
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const gameweek = searchParams.get('gameweek');
    const scope = searchParams.get('scope') || 'gameweek'; // 'gameweek', 'total', 'season'
    const limit = parseInt(searchParams.get('limit') || '50');

    // If no roomId provided, show global leaderboard
    if (!roomId) {
      // Global leaderboard - get all submitted lineups
      let globalQuery;
      let globalOrderField: string;

      const targetGameweek = gameweek ? parseInt(gameweek) : 1;

      switch (scope) {
        case 'total':
          globalOrderField = 'total_points';
          globalQuery = supabase
            .from('lineups')
            .select(`
              user_id,
              total_points,
              users!inner(id, username, display_name, avatar_url),
              room_id,
              rooms!inner(name)
            `)
            .eq('is_submitted', true);
          break;

        case 'gameweek':
        default:
          globalOrderField = 'gameweek_points';
          globalQuery = supabase
            .from('lineups')
            .select(`
              user_id,
              gameweek_points,
              total_points,
              gameweek,
              formation,
              captain_id,
              vice_captain_id,
              total_cost,
              submitted_at,
              users!inner(id, username, display_name, avatar_url),
              rooms!inner(name),
              players!lineups_captain_id_fkey(id, name, position, teams(short_name)),
              players_vice:players!lineups_vice_captain_id_fkey(id, name, position, teams(short_name))
            `)
            .eq('gameweek', targetGameweek)
            .eq('is_submitted', true);
          break;
      }

      const { data: globalData, error: globalError } = await globalQuery
        .order(globalOrderField, { ascending: false })
        .limit(limit);

      if (globalError) throw globalError;

      const globalLeaderboard = (globalData || []).map((entry: any, index: number) => ({
        ...entry,
        rank: index + 1,
        points: scope === 'total' ? entry.total_points : entry.gameweek_points
      }));

      return NextResponse.json({
        success: true,
        data: {
          leaderboard: globalLeaderboard,
          room: null,
          scope,
          gameweek: scope === 'gameweek' ? targetGameweek : null,
          stats: null,
          popular_captain: null,
          total_players: globalLeaderboard.length,
          last_updated: new Date().toISOString(),
          is_global: true
        }
      });
    }

    // Verify room exists
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, name, current_players, gameweek')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({
        success: false,
        error: 'Room not found'
      }, { status: 404 });
    }

    const targetGameweek = gameweek ? parseInt(gameweek) : room.gameweek;

    let query;
    let orderField: string;

    switch (scope) {
      case 'total':
        // Total points across all gameweeks
        orderField = 'total_points';
        query = supabase
          .from('lineups')
          .select(`
            user_id,
            total_points,
            users!inner(id, username, display_name, avatar_url),
            room_id
          `)
          .eq('room_id', roomId)
          .eq('is_submitted', true);
        break;

      case 'season':
        // Season total (aggregated)
        const { data: seasonData, error: seasonError } = await supabase
          .rpc('get_season_leaderboard', { 
            target_room_id: roomId 
          });

        if (seasonError) throw seasonError;

        return NextResponse.json({
          success: true,
          data: {
            leaderboard: seasonData || [],
            room: room,
            scope: 'season',
            gameweek: null,
            total_players: room.current_players
          }
        });

      case 'gameweek':
      default:
        // Specific gameweek
        orderField = 'gameweek_points';
        query = supabase
          .from('lineups')
          .select(`
            user_id,
            gameweek_points,
            total_points,
            gameweek,
            formation,
            captain_id,
            vice_captain_id,
            total_cost,
            submitted_at,
            users!inner(id, username, display_name, avatar_url),
            players!lineups_captain_id_fkey(id, name, position, teams(short_name)),
            players_vice:players!lineups_vice_captain_id_fkey(id, name, position, teams(short_name))
          `)
          .eq('room_id', roomId)
          .eq('gameweek', targetGameweek)
          .eq('is_submitted', true);
        break;
    }

    // Execute query with ordering and limit
    const { data: leaderboardData, error: leaderboardError } = await query
      .order(orderField, { ascending: false })
      .limit(limit);

    if (leaderboardError) throw leaderboardError;

    // Add rank to each entry
    const leaderboard = (leaderboardData || []).map((entry: any, index: number) => ({
      ...entry,
      rank: index + 1,
      points: scope === 'total' ? entry.total_points : entry.gameweek_points
    }));

    // Get additional stats for gameweek scope
    let stats = null;
    if (scope === 'gameweek' && leaderboard.length > 0) {
      const points = leaderboard.map((entry: any) => entry.gameweek_points);
      stats = {
        highest_score: Math.max(...points),
        lowest_score: Math.min(...points),
        average_score: (points.reduce((a: number, b: number) => a + b, 0) / points.length).toFixed(1),
        total_managers: points.length
      };
    }

    // Get most popular captain for this gameweek
    let popularCaptain = null;
    if (scope === 'gameweek') {
      const { data: captainStats, error: captainError } = await supabase
        .from('lineups')
        .select(`
          captain_id,
          players!lineups_captain_id_fkey(id, name, teams(short_name))
        `)
        .eq('room_id', roomId)
        .eq('gameweek', targetGameweek)
        .eq('is_submitted', true)
        .not('captain_id', 'is', null);

      if (!captainError && captainStats) {
        const captainCounts = captainStats.reduce((counts: any, lineup: any) => {
          const captainId = lineup.captain_id;
          counts[captainId] = (counts[captainId] || 0) + 1;
          return counts;
        }, {});

        const mostPopularCaptainId = Object.keys(captainCounts).reduce((a, b) => 
          captainCounts[a] > captainCounts[b] ? a : b
        );

        const captainInfo = captainStats.find(c => c.captain_id === mostPopularCaptainId);
        if (captainInfo && captainInfo.players) {
          popularCaptain = {
            ...captainInfo.players,
            selections: captainCounts[mostPopularCaptainId],
            percentage: ((captainCounts[mostPopularCaptainId] / captainStats.length) * 100).toFixed(1)
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        room,
        scope,
        gameweek: scope === 'gameweek' ? targetGameweek : null,
        stats,
        popular_captain: popularCaptain,
        total_players: room.current_players,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch leaderboard'
    }, { status: 500 });
  }
}