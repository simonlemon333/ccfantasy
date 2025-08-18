import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/admin/fix-fixtures - Fix inconsistent fixture data
export async function POST(request: NextRequest) {
  try {
    console.log('Starting fixtures data fix...');

    // Get all fixtures
    const { data: fixtures, error: fetchError } = await supabase
      .from('fixtures')
      .select('*');

    if (fetchError) {
      console.error('Error fetching fixtures:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch fixtures'
      }, { status: 500 });
    }

    let fixedCount = 0;
    const errors = [];

    // Fix inconsistent data
    for (const fixture of fixtures || []) {
      try {
        let needsUpdate = false;
        const updates: any = {};

        // Fix 1: If finished=true but no scores, set finished=false
        if (fixture.finished && (fixture.home_score === null || fixture.away_score === null)) {
          updates.finished = false;
          needsUpdate = true;
          console.log(`Fixing fixture ${fixture.id}: finished=true but missing scores`);
        }

        // Fix 2: If both scores exist but finished=false, set finished=true
        if (!fixture.finished && 
            fixture.home_score !== null && 
            fixture.away_score !== null) {
          updates.finished = true;
          needsUpdate = true;
          console.log(`Fixing fixture ${fixture.id}: has scores but finished=false`);
        }

        // Fix 3: Set default minutes_played if null
        if (fixture.minutes_played === null || fixture.minutes_played === undefined) {
          updates.minutes_played = fixture.finished ? 90 : 0;
          needsUpdate = true;
        }

        if (needsUpdate) {
          updates.updated_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('fixtures')
            .update(updates)
            .eq('id', fixture.id);

          if (updateError) {
            console.error(`Error updating fixture ${fixture.id}:`, updateError);
            errors.push(`Failed to update fixture ${fixture.id}: ${updateError.message}`);
          } else {
            fixedCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing fixture ${fixture.id}:`, error);
        errors.push(`Error processing fixture ${fixture.id}: ${error.message}`);
      }
    }

    // Get updated statistics
    const { data: updatedFixtures, error: statsError } = await supabase
      .from('fixtures')
      .select('*');

    const stats = {
      total: updatedFixtures?.length || 0,
      finished: updatedFixtures?.filter(f => f.finished).length || 0,
      withScores: updatedFixtures?.filter(f => f.home_score !== null && f.away_score !== null).length || 0,
      inconsistent: updatedFixtures?.filter(f => f.finished && (f.home_score === null || f.away_score === null)).length || 0
    };

    return NextResponse.json({
      success: true,
      data: {
        totalFixtures: fixtures?.length || 0,
        fixedFixtures: fixedCount,
        errors,
        stats
      },
      message: `Fixed ${fixedCount} fixtures with inconsistent data`
    });

  } catch (error) {
    console.error('Fixtures fix error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fix fixtures'
    }, { status: 500 });
  }
}

// GET /api/admin/fix-fixtures - Check fixture data consistency
export async function GET(request: NextRequest) {
  try {
    // Get all fixtures with statistics
    const { data: fixtures, error } = await supabase
      .from('fixtures')
      .select('*')
      .order('kickoff_time', { ascending: false });

    if (error) {
      throw error;
    }

    const stats = {
      total: fixtures?.length || 0,
      finished: fixtures?.filter(f => f.finished).length || 0,
      withScores: fixtures?.filter(f => f.home_score !== null && f.away_score !== null).length || 0,
      inconsistent: fixtures?.filter(f => f.finished && (f.home_score === null || f.away_score === null)).length || 0,
      noScoresButFinished: fixtures?.filter(f => f.finished && (f.home_score === null || f.away_score === null)) || [],
      scoresButNotFinished: fixtures?.filter(f => !f.finished && f.home_score !== null && f.away_score !== null) || []
    };

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentFixtures: fixtures?.slice(0, 10) // Show recent 10
      }
    });

  } catch (error) {
    console.error('Error checking fixtures:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check fixtures'
    }, { status: 500 });
  }
}