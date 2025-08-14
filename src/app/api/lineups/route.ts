import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateLineup, calculateLineupCost } from '@/lib/validateLineup';

interface PlayerSelection {
  id: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  team_id: string;
  price: number;
  is_starter: boolean;
  is_captain: boolean;
  is_vice_captain: boolean;
}

// GET /api/lineups - Get lineups for user/room
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const roomId = searchParams.get('roomId');
    const gameweek = searchParams.get('gameweek');

    let query = supabase
      .from('lineups')
      .select(`
        *,
        users(id, username, display_name),
        rooms(id, name, room_code),
        lineup_players(
          *,
          players(
            id, name, position, price, total_points,
            teams(short_name, name, logo_url, primary_color)
          )
        )
      `);

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (roomId) {
      query = query.eq('room_id', roomId);
    }
    if (gameweek) {
      query = query.eq('gameweek', parseInt(gameweek));
    }

    // Order by latest first
    query = query.order('created_at', { ascending: false });

    const { data: lineups, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: lineups
    });

  } catch (error) {
    console.error('Error fetching lineups:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch lineups'
    }, { status: 500 });
  }
}

// POST /api/lineups - Create/update lineup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      roomId,
      gameweek,
      players, // Array of PlayerSelection
      formation = '4-4-2',
      captainId,
      viceCaptainId,
      isSubmitted = false
    } = body;

    // Validation
    if (!userId || !roomId || !gameweek || !players || !Array.isArray(players)) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userId, roomId, gameweek, players'
      }, { status: 400 });
    }

    // Verify user is member of room
    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({
        success: false,
        error: 'User is not a member of this room'
      }, { status: 403 });
    }

    // Get player details from database for validation
    const playerIds = players.map((p: PlayerSelection) => p.id);
    const { data: dbPlayers, error: playersError } = await supabase
      .from('players')
      .select('id, position, team_id, price, is_available')
      .in('id', playerIds);

    if (playersError) throw playersError;

    if (dbPlayers.length !== playerIds.length) {
      return NextResponse.json({
        success: false,
        error: 'Some selected players do not exist'
      }, { status: 400 });
    }

    // Check if all players are available
    const unavailablePlayers = dbPlayers.filter(p => !p.is_available);
    if (unavailablePlayers.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Some players are no longer available: ${unavailablePlayers.map(p => p.id).join(', ')}`
      }, { status: 400 });
    }

    // Merge client data with database data for validation
    const validationPlayers: PlayerSelection[] = players.map((clientPlayer: PlayerSelection) => {
      const dbPlayer = dbPlayers.find(p => p.id === clientPlayer.id);
      return {
        id: clientPlayer.id,
        position: dbPlayer!.position,
        team_id: dbPlayer!.team_id,
        price: dbPlayer!.price,
        is_starter: clientPlayer.is_starter,
        is_captain: clientPlayer.is_captain,
        is_vice_captain: clientPlayer.is_vice_captain
      };
    });

    // Validate lineup
    const validation = validateLineup(validationPlayers);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Lineup validation failed',
        details: validation.errors
      }, { status: 400 });
    }

    // Calculate total cost
    const totalCost = calculateLineupCost(validationPlayers);

    // Check if lineup already exists for this user/room/gameweek
    const { data: existingLineup, error: existingError } = await supabase
      .from('lineups')
      .select('id')
      .eq('user_id', userId)
      .eq('room_id', roomId)
      .eq('gameweek', gameweek)
      .single();

    let lineupId: string;

    if (existingLineup) {
      // Update existing lineup
      const { data: updatedLineup, error: updateError } = await supabase
        .from('lineups')
        .update({
          formation,
          captain_id: captainId,
          vice_captain_id: viceCaptainId,
          total_cost: totalCost,
          is_submitted: isSubmitted,
          submitted_at: isSubmitted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLineup.id)
        .select()
        .single();

      if (updateError) throw updateError;
      lineupId = updatedLineup.id;

      // Delete existing lineup players
      const { error: deleteError } = await supabase
        .from('lineup_players')
        .delete()
        .eq('lineup_id', lineupId);

      if (deleteError) throw deleteError;

    } else {
      // Create new lineup
      const { data: newLineup, error: createError } = await supabase
        .from('lineups')
        .insert({
          user_id: userId,
          room_id: roomId,
          gameweek,
          formation,
          captain_id: captainId,
          vice_captain_id: viceCaptainId,
          total_cost: totalCost,
          is_submitted: isSubmitted,
          submitted_at: isSubmitted ? new Date().toISOString() : null
        })
        .select()
        .single();

      if (createError) throw createError;
      lineupId = newLineup.id;
    }

    // Insert lineup players
    const lineupPlayersData = validationPlayers.map(player => ({
      lineup_id: lineupId,
      player_id: player.id,
      position: player.position,
      is_starter: player.is_starter,
      is_captain: player.is_captain,
      is_vice_captain: player.is_vice_captain,
      multiplier: player.is_captain ? 2 : 1
    }));

    const { error: insertError } = await supabase
      .from('lineup_players')
      .insert(lineupPlayersData);

    if (insertError) throw insertError;

    // Fetch complete lineup data
    const { data: completeLineup, error: fetchError } = await supabase
      .from('lineups')
      .select(`
        *,
        users(id, username, display_name),
        rooms(id, name, room_code),
        lineup_players(
          *,
          players(
            id, name, position, price, total_points,
            teams(short_name, name, logo_url)
          )
        )
      `)
      .eq('id', lineupId)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({
      success: true,
      data: completeLineup,
      validation: {
        warnings: validation.warnings
      },
      message: existingLineup ? 'Lineup updated successfully' : 'Lineup created successfully'
    });

  } catch (error) {
    console.error('Error creating/updating lineup:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create/update lineup'
    }, { status: 500 });
  }
}