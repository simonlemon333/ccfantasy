import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSupabaseUser } from '@/lib/getSupabaseUser';

// POST /api/lineups/submit - Submit lineup to a specific room
export async function POST(request: NextRequest) {
  try {
    const supabaseUserResult = await getSupabaseUser(request);
    if ((supabaseUserResult as any).error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { supabaseUser, token } = supabaseUserResult as any;
    
    // Get current user from auth
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 401 });
    }

    const userId = user.id;

    const { lineupId, roomId } = await request.json();

    console.log('POST /api/lineups/submit:', { lineupId, roomId, userId });

    if (!lineupId || !roomId) {
      return NextResponse.json({
        success: false,
        error: 'Missing lineupId or roomId'
      }, { status: 400 });
    }

    // Verify user is a member of the room
    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({
        success: false,
        error: 'You are not a member of this league'
      }, { status: 403 });
    }

    // Get the room info for gameweek
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('gameweek')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({
        success: false,
        error: 'Room not found'
      }, { status: 404 });
    }

    // Get the draft lineup
    console.log('Looking for lineup:', { lineupId, userId });
    
    // Use user client for consistency with RLS policies
    const userClient = supabaseUser;
    
    // First, let's see what lineups exist for this user
    const { data: allUserLineups, error: allLineupsError } = await userClient
      .from('lineups')
      .select('id, formation, is_submitted, created_at')
      .eq('user_id', userId);
    
    console.log('All user lineups:', allUserLineups);
    
    const { data: lineup, error: lineupError } = await userClient
      .from('lineups')
      .select(`
        *,
        lineup_players(
          *,
          players(*)
        )
      `)
      .eq('id', lineupId)
      .eq('user_id', userId)
      .single();

    console.log('Lineup query result:', { lineup: lineup?.id, error: lineupError });

    if (lineupError || !lineup) {
      console.error('Lineup not found:', { lineupError, lineupId, userId });
      return NextResponse.json({
        success: false,
        error: `Lineup not found. Available lineups: ${allUserLineups?.map(l => l.id).join(', ')}`
      }, { status: 404 });
    }

    // Check if user already has ANY lineup for this room and gameweek (submitted or not)
    const { data: existingLineup, error: existingError } = await supabase
      .from('lineups')
      .select('id, is_submitted, room_id, gameweek')
      .eq('user_id', userId)
      .eq('room_id', roomId)
      .eq('gameweek', room.gameweek);

    console.log('Checking for existing lineups:', { 
      userId, 
      roomId, 
      gameweek: room.gameweek,
      found: existingLineup?.length || 0,
      existingLineup 
    });

    if (existingLineup && existingLineup.length > 0) {
      const submittedLineup = existingLineup.find(l => l.is_submitted);
      if (submittedLineup) {
        return NextResponse.json({
          success: false,
          error: `You have already submitted a lineup for gameweek ${room.gameweek} in this league`
        }, { status: 400 });
      } else {
        // Update existing unsubmitted lineup instead of creating new one
        const existingLineupId = existingLineup[0].id;
        console.log('Updating existing lineup:', existingLineupId);
        
        const { error: updateError } = await userClient
          .from('lineups')
          .update({
            formation: lineup.formation,
            captain_id: lineup.captain_id,
            vice_captain_id: lineup.vice_captain_id,
            total_cost: lineup.total_cost,
            is_submitted: true,
            submitted_at: new Date().toISOString()
          })
          .eq('id', existingLineupId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating lineup:', updateError);
          throw updateError;
        }

        // Delete existing lineup players and insert new ones
        await userClient
          .from('lineup_players')
          .delete()
          .eq('lineup_id', existingLineupId);

        const lineupPlayersData = lineup.lineup_players.map((lp: any) => ({
          lineup_id: existingLineupId,
          player_id: lp.player_id,
          position: lp.position,
          is_starter: lp.is_starter,
          is_captain: lp.is_captain,
          is_vice_captain: lp.is_vice_captain,
          multiplier: lp.multiplier || 1,
          points_scored: 0
        }));

        const { error: playersError } = await userClient
          .from('lineup_players')
          .insert(lineupPlayersData);

        if (playersError) {
          console.error('Error inserting lineup players:', playersError);
          throw playersError;
        }

        console.log('Lineup updated successfully:', existingLineupId);

        return NextResponse.json({
          success: true,
          message: `Lineup submitted successfully to gameweek ${room.gameweek}!`,
          data: {
            lineupId: existingLineupId,
            gameweek: room.gameweek
          }
        });
      }
    }

    // Create new submitted lineup for the room
    const { data: newLineup, error: createError } = await userClient
      .from('lineups')
      .insert({
        user_id: userId,
        room_id: roomId,
        gameweek: room.gameweek,
        formation: lineup.formation,
        captain_id: lineup.captain_id,
        vice_captain_id: lineup.vice_captain_id,
        total_cost: lineup.total_cost,
        total_points: 0, // Will be calculated later
        gameweek_points: 0,
        is_submitted: true,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating lineup:', createError);
      throw createError;
    }

    // Copy lineup players
    const lineupPlayersData = lineup.lineup_players.map((lp: any) => ({
      lineup_id: newLineup.id,
      player_id: lp.player_id,
      position: lp.position,
      is_starter: lp.is_starter,
      is_captain: lp.is_captain,
      is_vice_captain: lp.is_vice_captain,
      multiplier: lp.multiplier || 1,
      points_scored: 0 // Will be calculated later
    }));

    const { error: playersError } = await userClient
      .from('lineup_players')
      .insert(lineupPlayersData);

    if (playersError) {
      console.error('Error inserting lineup players:', playersError);
      throw playersError;
    }

    console.log('Lineup submitted successfully:', newLineup.id);

    return NextResponse.json({
      success: true,
      message: `Lineup submitted successfully to gameweek ${room.gameweek}!`,
      data: {
        lineupId: newLineup.id,
        gameweek: room.gameweek
      }
    });

  } catch (error: any) {
    console.error('Error submitting lineup:', error);
    
    if (error.code === '23505') {
      // Unique constraint violation
      return NextResponse.json({
        success: false,
        error: 'You have already submitted a lineup for this gameweek in this league. Each user can only submit one lineup per gameweek per league.'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to submit lineup'
    }, { status: 500 });
  }
}
