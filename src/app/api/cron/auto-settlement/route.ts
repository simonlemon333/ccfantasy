import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/cron/auto-settlement - Automatic settlement trigger (for cron jobs)
export async function POST(request: NextRequest) {
  try {
    // Verify cron authorization (in production, check auth header)
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Running automatic settlement check...');

    const results = {
      gameweeksChecked: 0,
      settlementsTriggered: 0,
      errors: []
    };

    // Check the last few gameweeks for settlements
    for (let gameweek = 1; gameweek <= 38; gameweek++) {
      try {
        results.gameweeksChecked++;

        // Check if all fixtures for this gameweek are finished
        const { data: fixtures, error: fixturesError } = await supabase
          .from('fixtures')
          .select('id, finished')
          .eq('gameweek', gameweek);

        if (fixturesError) {
          results.errors.push(`Error fetching fixtures for GW${gameweek}: ${fixturesError.message}`);
          continue;
        }

        if (!fixtures || fixtures.length === 0) {
          // No fixtures for this gameweek yet
          continue;
        }

        const allFinished = fixtures.every(f => f.finished);
        if (!allFinished) {
          // Still waiting for fixtures to finish
          continue;
        }

        // Check if there are any unsettled lineups
        const { data: unsettledLineups, error: lineupsError } = await supabase
          .from('lineups')
          .select('id, gameweek_points')
          .eq('gameweek', gameweek)
          .eq('is_submitted', true)
          .or('gameweek_points.is.null,gameweek_points.eq.0');

        if (lineupsError) {
          results.errors.push(`Error checking lineups for GW${gameweek}: ${lineupsError.message}`);
          continue;
        }

        if (!unsettledLineups || unsettledLineups.length === 0) {
          // All lineups already settled
          continue;
        }

        console.log(`Found ${unsettledLineups.length} unsettled lineups for gameweek ${gameweek}, triggering settlement...`);

        // Trigger settlement for this gameweek
        const settlementResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/settlement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameweek,
            roomId: null,
            forceRecalculate: false
          })
        });

        const settlementResult = await settlementResponse.json();

        if (settlementResult.success) {
          results.settlementsTriggered++;
          console.log(`Successfully triggered settlement for gameweek ${gameweek}`);
        } else {
          results.errors.push(`Settlement failed for GW${gameweek}: ${settlementResult.error}`);
        }

      } catch (error) {
        results.errors.push(`Error processing gameweek ${gameweek}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Auto-settlement check completed: ${results.settlementsTriggered} settlements triggered, ${results.gameweeksChecked} gameweeks checked`
    });

  } catch (error) {
    console.error('Auto-settlement error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Auto-settlement failed'
    }, { status: 500 });
  }
}

// GET /api/cron/auto-settlement - Check what would be auto-settled
export async function GET() {
  try {
    const pendingSettlements = [];

    for (let gameweek = 1; gameweek <= 38; gameweek++) {
      // Check fixtures
      const { data: fixtures } = await supabase
        .from('fixtures')
        .select('id, finished')
        .eq('gameweek', gameweek);

      if (!fixtures || fixtures.length === 0) continue;

      const allFinished = fixtures.every(f => f.finished);
      if (!allFinished) continue;

      // Check unsettled lineups
      const { data: unsettledLineups } = await supabase
        .from('lineups')
        .select('id')
        .eq('gameweek', gameweek)
        .eq('is_submitted', true)
        .or('gameweek_points.is.null,gameweek_points.eq.0');

      if (unsettledLineups && unsettledLineups.length > 0) {
        pendingSettlements.push({
          gameweek,
          fixturesFinished: fixtures.length,
          unsettledLineups: unsettledLineups.length
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        pendingSettlements,
        totalPending: pendingSettlements.length
      }
    });

  } catch (error) {
    console.error('Error checking auto-settlement status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check auto-settlement status'
    }, { status: 500 });
  }
}