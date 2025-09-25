import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/rooms/[id]/members - Get room members
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: roomId } = await params;

    // Get room members first
    const { data: members, error } = await supabase
      .from('room_members')
      .select('id, user_id, joined_at, is_active')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    if (error) throw error;

    // If we have members, fetch their user details separately
    let enrichedMembers = [];
    if (members && members.length > 0) {
      const userIds = members.map(m => m.user_id);

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, display_name')
        .in('id', userIds);

      if (usersError) {
        console.warn('Failed to fetch user details:', usersError);
      }

      // Create user lookup map
      const userMap = new Map();
      if (users) {
        users.forEach(user => {
          userMap.set(user.id, user);
        });
      }

      // Enrich members with user data
      enrichedMembers = members.map(member => ({
        ...member,
        users: userMap.get(member.user_id) || null
      }));
    } else {
      enrichedMembers = members || [];
    }

    return NextResponse.json({
      success: true,
      data: enrichedMembers
    });

  } catch (error) {
    console.error('Error fetching room members:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch room members'
    }, { status: 500 });
  }
}