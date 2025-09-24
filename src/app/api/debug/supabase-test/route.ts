import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Supabase connection...');
    
    // Test 1: Simple connection test
    const { data: connectionTest, error: connectionError } = await supabase
      .from('teams')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (connectionError) {
      console.error('Connection error:', connectionError);
      return NextResponse.json({
        success: false,
        error: 'Supabase connection failed',
        details: connectionError
      });
    }

    // Test 2: Check if tables exist
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, short_name')
      .limit(3);

    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('id, name, position')
      .limit(3);

    // Test 3: Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    return NextResponse.json({
      success: true,
      tests: {
        connection: connectionTest ? 'SUCCESS' : 'FAILED',
        teams: {
          error: teamsError?.message || null,
          count: teamsData?.length || 0,
          sample: teamsData?.slice(0, 2) || []
        },
        players: {
          error: playersError?.message || null,
          count: playersData?.length || 0,
          sample: playersData?.slice(0, 2) || []
        },
        environment: {
          supabaseUrl: supabaseUrl ? `${supabaseUrl.slice(0, 30)}...` : 'MISSING',
          supabaseKey: supabaseKey ? `${supabaseKey.slice(0, 30)}...` : 'MISSING'
        }
      }
    });

  } catch (error) {
    console.error('Supabase test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 10)
      } : error
    }, { status: 500 });
  }
}