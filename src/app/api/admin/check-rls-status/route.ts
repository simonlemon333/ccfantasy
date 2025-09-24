// @ts-nocheck
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Checking RLS status for tables...');

    // Check RLS status for relevant tables
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE tablename IN ('lineups', 'lineup_players', 'users', 'rooms', 'room_members', 'teams', 'players')
          ORDER BY tablename;
        `
      });

    if (rlsError) {
      console.error('Error checking RLS status:', rlsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check RLS status',
        details: rlsError
      }, { status: 500 });
    }

    // Also check existing policies
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
          FROM pg_policies 
          WHERE tablename IN ('lineups', 'lineup_players', 'users')
          ORDER BY tablename, policyname;
        `
      });

    console.log('RLS Status Results:', rlsStatus);
    console.log('Policies Results:', policies);

    return NextResponse.json({
      success: true,
      message: 'RLS status check completed',
      data: {
        rlsStatus: rlsStatus || [],
        policies: policies || [],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('RLS status check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'RLS status check failed with exception',
      details: error.message
    }, { status: 500 });
  }
}