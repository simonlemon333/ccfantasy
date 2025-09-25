import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/rooms/[id]/leave - Leave a room
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: roomId } = await params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Check if user is actually a member
    const { data: existingMember } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!existingMember) {
      return NextResponse.json({
        success: false,
        error: 'You are not a member of this room'
      }, { status: 400 });
    }

    // Deactivate membership
    const { error: deactivateError } = await supabase
      .from('room_members')
      .update({ is_active: false })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (deactivateError) throw deactivateError;

    // Update room current_players count
    const { error: updateError } = await supabase.rpc('decrement_room_players', {
      room_uuid: roomId
    });

    if (updateError) {
      console.warn('Failed to update room player count:', updateError);
      // Don't fail the request if this fails, just log it
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully left the room'
    });

  } catch (error) {
    console.error('Error leaving room:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to leave room'
    }, { status: 500 });
  }
}