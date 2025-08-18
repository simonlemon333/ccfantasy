import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fplApi } from '@/lib/fplApi';

// POST /api/admin/sync-fixtures - Sync fixtures and scores from FPL API
export async function POST(request: NextRequest) {
  try {
    console.log('Starting fixtures sync...');

    // Get current fixtures from FPL API
    const fplFixtures = await fplApi.getFixtures();
    console.log(`Found ${fplFixtures.length} fixtures from FPL API`);

    // Get existing fixtures from our database
    const { data: existingFixtures, error: fetchError } = await supabase
      .from('fixtures')
      .select('*');

    if (fetchError) {
      console.error('Error fetching existing fixtures:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch existing fixtures'
      }, { status: 500 });
    }

    let updatedCount = 0;
    let createdCount = 0;
    const errors = [];

    // Process each FPL fixture
    for (const fplFixture of fplFixtures) {
      try {
        // Find existing fixture by FPL ID or by teams and gameweek
        const existingFixture = existingFixtures?.find(f => 
          f.fpl_id === fplFixture.id ||
          (f.gameweek === fplFixture.event && 
           f.home_team_fpl_id === fplFixture.team_h && 
           f.away_team_fpl_id === fplFixture.team_a)
        );

        const fixtureData = {
          fpl_id: fplFixture.id,
          gameweek: fplFixture.event,
          home_team_fpl_id: fplFixture.team_h,
          away_team_fpl_id: fplFixture.team_a,
          home_score: fplFixture.team_h_score || null,
          away_score: fplFixture.team_a_score || null,
          finished: fplFixture.finished,
          minutes_played: fplFixture.minutes,
          kickoff_time: fplFixture.kickoff_time,
          updated_at: new Date().toISOString()
        };

        if (existingFixture) {
          // Update existing fixture
          const { error: updateError } = await supabase
            .from('fixtures')
            .update(fixtureData)
            .eq('id', existingFixture.id);

          if (updateError) {
            console.error(`Error updating fixture ${fplFixture.id}:`, updateError);
            errors.push(`Failed to update fixture ${fplFixture.id}: ${updateError.message}`);
          } else {
            updatedCount++;
            console.log(`Updated fixture: ${fplFixture.team_h} vs ${fplFixture.team_a}`);
          }
        } else {
          // Create new fixture
          const { error: createError } = await supabase
            .from('fixtures')
            .insert({
              ...fixtureData,
              created_at: new Date().toISOString()
            });

          if (createError) {
            console.error(`Error creating fixture ${fplFixture.id}:`, createError);
            errors.push(`Failed to create fixture ${fplFixture.id}: ${createError.message}`);
          } else {
            createdCount++;
            console.log(`Created fixture: ${fplFixture.team_h} vs ${fplFixture.team_a}`);
          }
        }
      } catch (error) {
        console.error(`Error processing fixture ${fplFixture.id}:`, error);
        errors.push(`Error processing fixture ${fplFixture.id}: ${error.message}`);
      }
    }

    // Get updated count
    const { data: finalFixtures, error: finalError } = await supabase
      .from('fixtures')
      .select('count', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      data: {
        fixturesFromAPI: fplFixtures.length,
        existingFixtures: existingFixtures?.length || 0,
        created: createdCount,
        updated: updatedCount,
        finalCount: finalFixtures?.length || 0,
        errors
      },
      message: `Fixtures sync completed: ${createdCount} created, ${updatedCount} updated`
    });

  } catch (error) {
    console.error('Fixtures sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync fixtures'
    }, { status: 500 });
  }
}

// GET /api/admin/sync-fixtures - Check fixtures sync status
export async function GET(request: NextRequest) {
  try {
    // Get recent fixtures with scores
    const { data: recentFixtures, error } = await supabase
      .from('fixtures')
      .select('*')
      .order('kickoff_time', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    // Count fixtures by status
    const finishedCount = recentFixtures?.filter(f => f.finished)?.length || 0;
    const withScoresCount = recentFixtures?.filter(f => f.home_score !== null && f.away_score !== null)?.length || 0;
    const inconsistentCount = recentFixtures?.filter(f => f.finished && (f.home_score === null || f.away_score === null))?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalFixtures: recentFixtures?.length || 0,
        finishedFixtures: finishedCount,
        fixturesWithScores: withScoresCount,
        inconsistentFixtures: inconsistentCount,
        recentFixtures: recentFixtures?.slice(0, 5) // Show first 5
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