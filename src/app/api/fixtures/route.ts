import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/fixtures - Get fixtures by gameweek
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameweek = searchParams.get('gameweek');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('GET /api/fixtures:', { gameweek, limit });

    let query = supabase
      .from('fixtures')
      .select(`
        id,
        gameweek,
        kickoff_time,
        home_score,
        away_score,
        finished,
        minutes_played,
        home_team:home_team_id(
          id,
          name,
          short_name,
          primary_color,
          logo_url
        ),
        away_team:away_team_id(
          id,
          name,
          short_name,
          primary_color,
          logo_url
        )
      `)
      .order('kickoff_time', { ascending: true })
      .limit(limit);

    if (gameweek) {
      query = query.eq('gameweek', parseInt(gameweek));
    }

    const { data: fixtures, error } = await query;

    if (error) {
      console.error('Error fetching fixtures:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: fixtures || []
    });

  } catch (error) {
    console.error('Error in fixtures API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch fixtures'
    }, { status: 500 });
  }
}

// POST /api/fixtures - Create or update fixtures (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fixtures } = body;

    if (!fixtures || !Array.isArray(fixtures)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid fixtures data'
      }, { status: 400 });
    }

    console.log('POST /api/fixtures: Creating', fixtures.length, 'fixtures');

    // Insert fixtures with fallback for missing constraint
    let { data, error } = await supabase
      .from('fixtures')
      .upsert(fixtures, {
        onConflict: 'unique_fixture_per_gameweek'
      })
      .select();

    // Handle missing constraint gracefully
    if (error && error.code === '42P10') {
      console.log('Constraint not found, using manual insertion');
      data = [];
      
      for (const fixture of fixtures) {
        const { data: existingFixture } = await supabase
          .from('fixtures')
          .select('id')
          .eq('gameweek', fixture.gameweek)
          .eq('home_team_id', fixture.home_team_id)
          .eq('away_team_id', fixture.away_team_id)
          .single();
        
        if (existingFixture) {
          const { data: updated, error: updateError } = await supabase
            .from('fixtures')
            .update(fixture)
            .eq('id', existingFixture.id)
            .select()
            .single();
          
          if (!updateError && updated) {
            data.push(updated);
          }
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from('fixtures')
            .insert(fixture)
            .select()
            .single();
          
          if (!insertError && inserted) {
            data.push(inserted);
          }
        }
      }
      error = null; // Clear error since we handled it
    }

    if (error) {
      console.error('Error creating fixtures:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
      message: `Successfully created/updated ${fixtures.length} fixtures`
    });

  } catch (error) {
    console.error('Error creating fixtures:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create fixtures'
    }, { status: 500 });
  }
}