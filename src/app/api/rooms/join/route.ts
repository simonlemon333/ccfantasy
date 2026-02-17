import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/requireAuth';

// POST /api/rooms/join - Join room by room code
export async function POST(request: NextRequest) {
  try {
    // Verify identity from token
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const body = await request.json();
    const { roomCode } = body;
    // Use verified user ID from token, not from body
    const userId = authResult.user.id;

    // Validation
    if (!roomCode) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: roomCode'
      }, { status: 400 });
    }

    // Find room by code
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid room code or room not found' 
      }, { status: 404 });
    }

    // Check if room is full
    if (room.current_players >= room.max_players) {
      return NextResponse.json({ 
        success: false, 
        error: 'Room is full' 
      }, { status: 400 });
    }

    // Check if user is already in room
    const { data: existingMember } = await supabase
      .from('room_members')
      .select('id, is_active')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      if (existingMember.is_active) {
        return NextResponse.json({ 
          success: false, 
          error: 'You are already a member of this room' 
        }, { status: 400 });
      } else {
        // Reactivate membership
        const { error: reactivateError } = await supabase
          .from('room_members')
          .update({ is_active: true })
          .eq('id', existingMember.id);

        if (reactivateError) throw reactivateError;

        // Update room current_players count
        const { error: updateError } = await supabase
          .from('rooms')
          .update({ 
            current_players: room.current_players + 1 
          })
          .eq('id', room.id);

        if (updateError) throw updateError;

        return NextResponse.json({ 
          success: true, 
          data: room,
          message: 'Successfully rejoined room' 
        });
      }
    }

    // Add user to room
    const { error: memberError } = await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: userId
      });

    if (memberError) {
      if (memberError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          success: false, 
          error: 'You are already a member of this room' 
        }, { status: 400 });
      }
      throw memberError;
    }

    // Update room current_players count
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ 
        current_players: room.current_players + 1 
      })
      .eq('id', room.id);

    if (updateError) throw updateError;

    // Get updated room data with member info
    const { data: updatedRoom, error: fetchError } = await supabase
      .from('rooms')
      .select(`
        *,
        users!rooms_created_by_fkey(username, display_name),
        room_members(
          user_id,
          joined_at,
          users(username, display_name, avatar_url)
        )
      `)
      .eq('id', room.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({ 
      success: true, 
      data: updatedRoom,
      message: `Successfully joined "${room.name}"` 
    });

  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to join room' 
    }, { status: 500 });
  }
}