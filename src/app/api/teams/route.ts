import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/teams - Get all teams
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/teams');

    const { data: teams, error } = await supabase
      .from('teams')
      .select('id, name, short_name, logo_url, primary_color, secondary_color')
      .order('name');

    if (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: teams || []
    });

  } catch (error) {
    console.error('Error in teams API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch teams'
    }, { status: 500 });
  }
}