import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/debug/lineups - Debug lineups
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing userId'
      }, { status: 400 });
    }

    // Get all lineups for this user
    const { data: lineups, error } = await supabase
      .from('lineups')
      .select('*')
      .eq('user_id', userId);

    console.log('Debug lineups for user:', userId);
    console.log('Found lineups:', lineups);

    return NextResponse.json({
      success: true,
      data: {
        userId,
        lineups: lineups || [],
        count: lineups?.length || 0
      }
    });

  } catch (error) {
    console.error('Error debugging lineups:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to debug lineups'
    }, { status: 500 });
  }
}
