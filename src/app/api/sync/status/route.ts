import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fplApi } from '@/lib/fplApi';

// GET /api/sync/status - Get quick sync status without heavy operations
export async function GET() {
  try {
    // Get basic counts
    const [playersCount, fixturesCount, currentGameweek] = await Promise.all([
      supabase.from('players').select('*', { count: 'exact', head: true }),
      supabase.from('fixtures').select('*', { count: 'exact', head: true }),
      fplApi.getCurrentGameweek().catch(() => 1) // Fallback to 1 if API fails
    ]);

    // Get last updated timestamp
    const { data: latestPlayer } = await supabase
      .from('players')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    // Get fixtures for current gameweek
    const { count: currentGwFixtures } = await supabase
      .from('fixtures')
      .select('*', { count: 'exact', head: true })
      .eq('gameweek', currentGameweek);

    return NextResponse.json({
      success: true,
      data: {
        totalPlayers: playersCount.count || 0,
        totalFixtures: fixturesCount.count || 0,
        currentGameweekFixtures: currentGwFixtures || 0,
        currentGameweek,
        lastUpdated: latestPlayer?.updated_at,
        syncAvailable: true,
        recommendations: {
          needsPlayerSync: (playersCount.count || 0) < 100,
          needsFixtureSync: (currentGwFixtures || 0) === 0,
          lastSyncAgo: latestPlayer?.updated_at ? 
            Math.floor((Date.now() - new Date(latestPlayer.updated_at).getTime()) / (1000 * 60 * 60)) : null
        }
      }
    });

  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get sync status'
    }, { status: 500 });
  }
}