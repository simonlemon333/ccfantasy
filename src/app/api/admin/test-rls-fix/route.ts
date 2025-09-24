// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { userId = '60446064-067a-439f-b5e1-8dd320833b95' } = await request.json();
    
    console.log('Testing RLS fix with admin client for user:', userId);

    // Test 1: Try to create a test lineup using admin client
    const testLineupData = {
      user_id: userId,
      gameweek: 1,
      formation: '4-4-2',
      total_cost: 100.0,
      total_points: 0,
      gameweek_points: 0,
      is_submitted: false
    };

    console.log('Creating test lineup:', testLineupData);
    
    const { data: testLineup, error: createError } = await supabaseAdmin
      .from('lineups')
      .insert(testLineupData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating test lineup:', createError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create test lineup',
        details: createError
      }, { status: 500 });
    }

    console.log('Test lineup created successfully:', testLineup.id);

    // Test 2: Try to create lineup players
    const testPlayersData = [
      {
        lineup_id: testLineup.id,
        player_id: '346e0f84-5f52-4817-9973-fc748b8a60de', // Example player ID
        position: 'FWD',
        is_starter: true,
        is_captain: false,
        is_vice_captain: false,
        multiplier: 1,
        points_scored: 0
      }
    ];

    const { data: lineupPlayers, error: playersError } = await supabaseAdmin
      .from('lineup_players')
      .insert(testPlayersData)
      .select();

    if (playersError) {
      console.error('Error creating lineup players:', playersError);
      // Clean up the test lineup
      await supabaseAdmin.from('lineups').delete().eq('id', testLineup.id);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to create lineup players',
        details: playersError
      }, { status: 500 });
    }

    console.log('Test lineup players created successfully');

    // Clean up test data
    await supabaseAdmin.from('lineup_players').delete().eq('lineup_id', testLineup.id);
    await supabaseAdmin.from('lineups').delete().eq('id', testLineup.id);

    console.log('Test data cleaned up successfully');

    return NextResponse.json({
      success: true,
      message: 'RLS fix test passed! Admin client can create lineups and lineup_players',
      testResults: {
        lineupCreated: true,
        lineupId: testLineup.id,
        playersCreated: lineupPlayers?.length || 0,
        cleanedUp: true
      }
    });

  } catch (error: any) {
    console.error('RLS fix test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'RLS fix test failed',
      details: error.message
    }, { status: 500 });
  }
}