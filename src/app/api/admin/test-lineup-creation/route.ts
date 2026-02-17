// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/requireAdminAuth';

export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const { userId = '60446064-067a-439f-b5e1-8dd320833b95', roomId = 'd15f062a-adfd-42bc-b8d8-e4144a18c1c4' } = await request.json();
    
    console.log('Testing lineup creation without RLS blocking...');

    // Test 1: Try to create a test lineup directly
    const testLineupData = {
      user_id: userId,
      room_id: roomId,
      gameweek: 1,
      formation: '4-4-2',
      total_cost: 100.0,
      total_points: 0,
      gameweek_points: 0,
      is_submitted: false
    };

    console.log('Creating test lineup:', testLineupData);
    
    const { data: testLineup, error: createError } = await supabase
      .from('lineups')
      .insert(testLineupData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating test lineup:', createError);
      
      // Check if it's an RLS error specifically
      if (createError.message?.includes('row-level security')) {
        return NextResponse.json({
          success: false,
          error: 'RLS still blocking lineup creation',
          details: createError,
          recommendation: 'Run scripts/07_disable_rls_temporarily.sql in Supabase SQL Editor'
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Non-RLS error creating lineup',
        details: createError
      }, { status: 500 });
    }

    console.log('Test lineup created successfully:', testLineup.id);

    // Test 2: Try to create lineup players
    const testPlayersData = [
      {
        lineup_id: testLineup.id,
        player_id: '346e0f84-5f52-4817-9973-fc748b8a60de', // Erling Haaland from earlier
        position: 'FWD',
        is_starter: true,
        is_captain: true,
        is_vice_captain: false,
        multiplier: 2,
        points_scored: 0
      },
      {
        lineup_id: testLineup.id,
        player_id: 'a1a1fa6f-811f-4f0e-bfb3-94bb945c413e', // Riccardo Calafiori from earlier
        position: 'DEF',
        is_starter: true,
        is_captain: false,
        is_vice_captain: true,
        multiplier: 1,
        points_scored: 0
      }
    ];

    const { data: lineupPlayers, error: playersError } = await supabase
      .from('lineup_players')
      .insert(testPlayersData)
      .select();

    if (playersError) {
      console.error('Error creating lineup players:', playersError);
      
      // Clean up the test lineup
      await supabase.from('lineups').delete().eq('id', testLineup.id);
      
      if (playersError.message?.includes('row-level security')) {
        return NextResponse.json({
          success: false,
          error: 'RLS still blocking lineup_players creation',
          details: playersError,
          recommendation: 'Run scripts/07_disable_rls_temporarily.sql in Supabase SQL Editor'
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Non-RLS error creating lineup players',
        details: playersError
      }, { status: 500 });
    }

    console.log('Test lineup players created successfully:', lineupPlayers?.length);

    // Test 3: Try to update the lineup (simulate submission)
    const { data: updatedLineup, error: updateError } = await supabase
      .from('lineups')
      .update({
        is_submitted: true,
        submitted_at: new Date().toISOString()
      })
      .eq('id', testLineup.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lineup:', updateError);
      
      // Clean up
      await supabase.from('lineup_players').delete().eq('lineup_id', testLineup.id);
      await supabase.from('lineups').delete().eq('id', testLineup.id);
      
      if (updateError.message?.includes('row-level security')) {
        return NextResponse.json({
          success: false,
          error: 'RLS still blocking lineup updates',
          details: updateError
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Non-RLS error updating lineup',
        details: updateError
      }, { status: 500 });
    }

    // Clean up test data
    await supabase.from('lineup_players').delete().eq('lineup_id', testLineup.id);
    await supabase.from('lineups').delete().eq('id', testLineup.id);

    console.log('All tests passed! RLS is not blocking lineup operations.');

    return NextResponse.json({
      success: true,
      message: 'RLS fix successful! All lineup operations work correctly',
      testResults: {
        lineupCreated: true,
        lineupId: testLineup.id,
        playersCreated: lineupPlayers?.length || 0,
        lineupUpdated: updatedLineup?.is_submitted || false,
        cleanedUp: true
      },
      recommendation: 'Lineup submission should now work in the frontend!'
    });

  } catch (error: any) {
    console.error('RLS test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'RLS test failed with exception',
      details: error.message
    }, { status: 500 });
  }
}