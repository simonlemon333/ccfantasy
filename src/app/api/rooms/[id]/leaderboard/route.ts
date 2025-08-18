import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/rooms/[id]/leaderboard - Get league leaderboard with lineups
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const { searchParams } = new URL(request.url);
    const gameweek = searchParams.get('gameweek');

    console.log('GET /api/rooms/[id]/leaderboard:', { roomId, gameweek });

    // First check how many lineups exist for this room
    const { data: allLineups, error: checkError } = await supabase
      .from('lineups')
      .select('id, room_id, user_id, gameweek, is_submitted, total_points')
      .eq('room_id', roomId);

    console.log('All lineups for room:', allLineups);
    console.log('Submitted lineups:', allLineups?.filter(l => l.is_submitted));
    
    // Also check all lineups in database for debugging
    const { data: allLineupsInDB } = await supabase
      .from('lineups')
      .select('id, room_id, user_id, gameweek, is_submitted, total_points')
      .limit(20);
    
    console.log('All lineups in database (last 20):', allLineupsInDB);

    // Try a simpler query first
    let simpleQuery = supabase
      .from('lineups')
      .select(`
        id,
        user_id,
        gameweek,
        total_points,
        gameweek_points,
        formation,
        captain_id,
        vice_captain_id,
        total_cost,
        is_submitted,
        submitted_at
      `)
      .eq('room_id', roomId)
      .eq('is_submitted', true)
      .order('total_points', { ascending: false });

    const { data: simpleLineups, error: simpleError } = await simpleQuery;
    console.log('Simple query result:', { 
      found: simpleLineups?.length || 0, 
      error: simpleError?.message,
      lineups: simpleLineups 
    });

    // Get all lineups for the room (current gameweek if not specified)
    let query = supabase
      .from('lineups')
      .select(`
        id,
        user_id,
        gameweek,
        total_points,
        gameweek_points,
        formation,
        captain_id,
        vice_captain_id,
        total_cost,
        is_submitted,
        submitted_at,
        users(id, username, display_name, avatar_url),
        lineup_players(
          id,
          player_id,
          position,
          is_starter,
          is_captain,
          is_vice_captain,
          points_scored,
          players(
            id,
            name,
            position,
            price,
            total_points,
            photo_url,
            teams(short_name, name, primary_color)
          )
        )
      `)
      .eq('room_id', roomId)
      .eq('is_submitted', true)  // Only show submitted lineups
      .order('total_points', { ascending: false });

    if (gameweek) {
      query = query.eq('gameweek', parseInt(gameweek));
    }

    const { data: lineups, error } = await query;

    console.log('Leaderboard query result:', { 
      lineupsFound: lineups?.length || 0, 
      error: error?.message,
      firstLineup: lineups?.[0]
    });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      // Don't throw, let's see what we can salvage
    }

    // Get room info for current gameweek
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, gameweek, name')
      .eq('id', roomId)
      .single();

    if (roomError) {
      console.error('Error fetching room:', roomError);
      throw roomError;
    }

    // If no specific gameweek requested, use room's current gameweek
    const currentGameweek = gameweek ? parseInt(gameweek) : room.gameweek;

    // Filter lineups for the target gameweek
    const gameweekLineups = lineups?.filter(lineup => lineup.gameweek === currentGameweek) || [];

    // Sort by total points (descending) then by submission time
    const sortedLineups = gameweekLineups.sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }
      // If points are equal, earlier submission wins
      if (a.submitted_at && b.submitted_at) {
        return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
      }
      return 0;
    });

    // Add ranking
    const leaderboard = sortedLineups.map((lineup, index) => ({
      ...lineup,
      rank: index + 1
    }));

    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        gameweek: currentGameweek,
        roomName: room.name,
        totalEntries: leaderboard.length,
        debug: {
          totalLineupsInRoom: allLineups?.length || 0,
          submittedLineups: allLineups?.filter(l => l.is_submitted)?.length || 0,
          lineupsForGameweek: gameweekLineups.length,
          requestedGameweek: gameweek,
          roomCurrentGameweek: room.gameweek
        }
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
