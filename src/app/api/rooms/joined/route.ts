import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSupabaseUser } from '@/lib/getSupabaseUser';

// GET /api/rooms/joined - Get rooms that the user has joined
export async function GET(request: NextRequest) {
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

    console.log('GET /api/rooms/joined for user:', userId);

    // Get rooms that the user is a member of
    const { data: roomMembers, error } = await supabase
      .from('room_members')
      .select(`
        room_id,
        joined_at,
        is_active,
        rooms(
          id,
          room_code,
          name,
          description,
          max_players,
          current_players,
          season,
          gameweek,
          is_active,
          is_public,
          budget_limit,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching joined rooms:', error);
      throw error;
    }

    // Extract room data
    const joinedRooms = roomMembers?.map(member => ({
      ...member.rooms,
      joined_at: member.joined_at
    })) || [];

    console.log('Found joined rooms:', joinedRooms.length);

    return NextResponse.json({
      success: true,
      data: joinedRooms
    });

  } catch (error) {
    console.error('Error fetching joined rooms:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch joined rooms'
    }, { status: 500 });
  }
}
