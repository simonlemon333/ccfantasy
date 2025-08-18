import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/rooms - Get rooms for user or public rooms
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const isPublic = searchParams.get('public') === 'true';

    if (isPublic) {
      // Get public rooms
      console.log('Fetching public rooms...'); // Debug log
      
      // First, let's check all rooms to see what we have
      const { data: allRooms, error: allError } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('All rooms in database:', allRooms); // Debug log
      
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select(`
          *,
          room_members(count),
          users!rooms_created_by_fkey(username)
        `)
        .eq('is_public', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('Public rooms query result:', { rooms, error }); // Debug log

      if (error) throw error;

      return NextResponse.json({ 
        success: true, 
        data: rooms || []
      });
    }

    if (userId) {
      // Get rooms for specific user
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select(`
          *,
          room_members!inner(user_id),
          users!rooms_created_by_fkey(username)
        `)
        .eq('room_members.user_id', userId)
        .eq('room_members.is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return NextResponse.json({ 
        success: true, 
        data: rooms 
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Missing userId or public parameter' 
    }, { status: 400 });

  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch rooms' 
    }, { status: 500 });
  }
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Create room request body:', body); // Debug log
    const { 
      name, 
      description, 
      createdBy, 
      max_players: maxPlayers = 10, 
      is_public: isPublic = false, 
      budget_limit: budgetLimit = 100.0 
    } = body;

    // Validation
    if (!name || !createdBy) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: name, createdBy' 
      }, { status: 400 });
    }

    if (name.length > 50) {
      return NextResponse.json({ 
        success: false, 
        error: 'Room name must be 50 characters or less' 
      }, { status: 400 });
    }

    if (maxPlayers < 2 || maxPlayers > 20) {
      return NextResponse.json({ 
        success: false, 
        error: 'Max players must be between 2 and 20' 
      }, { status: 400 });
    }

    // Generate room code
    const { data: roomCodeData } = await supabase.rpc('generate_room_code');
    const roomCode = roomCodeData || Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        room_code: roomCode,
        name,
        description,
        created_by: createdBy,
        max_players: maxPlayers,
        current_players: 1, // Creator is automatically added
        is_public: isPublic,
        budget_limit: budgetLimit
      })
      .select()
      .single();

    if (roomError) throw roomError;

    // Add creator as room member
    const { error: memberError } = await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: createdBy
      });

    if (memberError) throw memberError;

    return NextResponse.json({ 
      success: true, 
      data: room,
      message: `Room created successfully with code: ${roomCode}`
    });

  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create room' 
    }, { status: 500 });
  }
}