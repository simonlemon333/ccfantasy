import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/rooms/[id] - Get specific room details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: room, error } = await supabase
      .from('rooms')
      .select(`
        *,
        users!rooms_created_by_fkey(id, username, display_name),
        room_members(
          user_id,
          joined_at,
          is_active,
          users(id, username, display_name, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          success: false, 
          error: 'Room not found' 
        }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      data: room 
    });

  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch room' 
    }, { status: 500 });
  }
}

// PUT /api/rooms/[id] - Update room settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, maxPlayers, isPublic, budgetLimit, gameweek, isActive, userId } = body;

    // Check if user is room owner
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('created_by')
      .eq('id', id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ 
        success: false, 
        error: 'Room not found' 
      }, { status: 404 });
    }

    if (room.created_by !== userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only room owner can update settings' 
      }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (maxPlayers !== undefined) updateData.max_players = maxPlayers;
    if (isPublic !== undefined) updateData.is_public = isPublic;
    if (budgetLimit !== undefined) updateData.budget_limit = budgetLimit;
    if (gameweek !== undefined) updateData.gameweek = gameweek;
    if (isActive !== undefined) updateData.is_active = isActive;

    // Update room
    const { data: updatedRoom, error: updateError } = await supabase
      .from('rooms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      data: updatedRoom,
      message: 'Room updated successfully'
    });

  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update room' 
    }, { status: 500 });
  }
}

// DELETE /api/rooms/[id] - Delete room (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing userId parameter' 
      }, { status: 400 });
    }

    // Check if user is room owner
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('created_by')
      .eq('id', id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ 
        success: false, 
        error: 'Room not found' 
      }, { status: 404 });
    }

    if (room.created_by !== userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only room owner can delete room' 
      }, { status: 403 });
    }

    // Delete room (cascades to room_members, lineups, etc.)
    const { error: deleteError } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ 
      success: true, 
      message: 'Room deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete room' 
    }, { status: 500 });
  }
}