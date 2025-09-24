// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/admin/sync-real-fixtures - Sync real fixtures data from FPL API
export async function POST(request: NextRequest) {
  try {
    console.log('Syncing real fixtures from FPL API...');

    // Get current gameweek fixtures from FPL API
    const fplResponse = await fetch('https://fantasy.premierleague.com/api/fixtures/');
    if (!fplResponse.ok) {
      throw new Error(`FPL API error: ${fplResponse.status}`);
    }
    
    const allFplFixtures = await fplResponse.json();
    console.log(`Found ${allFplFixtures.length} total fixtures from FPL API`);

    // Filter for current gameweek (assuming gameweek 1)
    const currentGameweek = 1;
    const gwFixtures = allFplFixtures.filter(f => f.event === currentGameweek);
    console.log(`Found ${gwFixtures.length} fixtures for gameweek ${currentGameweek}`);

    // Get teams data from FPL API for team mapping
    const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!bootstrapResponse.ok) {
      throw new Error(`FPL Bootstrap API error: ${bootstrapResponse.status}`);
    }
    
    const bootstrapData = await bootstrapResponse.json();
    const fplTeams = bootstrapData.teams;
    console.log(`Found ${fplTeams.length} teams from FPL API`);

    // Create FPL team to our team mapping
    const { data: ourTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, short_name');

    if (teamsError) {
      throw new Error(`Failed to get our teams: ${teamsError.message}`);
    }

    // Create mapping based on short names
    const teamMapping = new Map();
    fplTeams.forEach(fplTeam => {
      const ourTeam = ourTeams?.find(t => 
        t.short_name === fplTeam.short_name || 
        t.name === fplTeam.name
      );
      if (ourTeam) {
        teamMapping.set(fplTeam.id, ourTeam.id);
      }
    });

    console.log(`Created mapping for ${teamMapping.size} teams`);

    // Clear existing fixtures for this gameweek
    const { error: deleteError } = await supabase
      .from('fixtures')
      .delete()
      .eq('gameweek', currentGameweek);

    if (deleteError) {
      console.error('Error deleting old fixtures:', deleteError);
    }

    let createdCount = 0;
    const errors = [];

    // Insert real fixtures
    for (const fplFixture of gwFixtures) {
      try {
        const homeTeamId = teamMapping.get(fplFixture.team_h);
        const awayTeamId = teamMapping.get(fplFixture.team_a);

        if (!homeTeamId || !awayTeamId) {
          console.warn(`Skipping fixture - missing team mapping: ${fplFixture.team_h} vs ${fplFixture.team_a}`);
          continue;
        }

        const fixtureData = {
          gameweek: fplFixture.event,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          home_score: fplFixture.team_h_score,
          away_score: fplFixture.team_a_score,
          finished: fplFixture.finished,
          minutes_played: fplFixture.minutes || 0,
          kickoff_time: fplFixture.kickoff_time,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('fixtures')
          .insert(fixtureData);

        if (insertError) {
          console.error(`Error inserting fixture:`, insertError);
          errors.push(`Failed to insert fixture: ${insertError.message}`);
        } else {
          createdCount++;
          const homeTeam = fplTeams.find(t => t.id === fplFixture.team_h);
          const awayTeam = fplTeams.find(t => t.id === fplFixture.team_a);
          console.log(`Created: ${homeTeam?.short_name} ${fplFixture.team_h_score || 0} - ${fplFixture.team_a_score || 0} ${awayTeam?.short_name} (${fplFixture.finished ? '已结束' : '未结束'})`);
        }

      } catch (error) {
        console.error(`Error processing fixture:`, error);
        errors.push(`Error processing fixture: ${error.message}`);
      }
    }

    // Get final count and sample data
    const { data: finalFixtures, error: finalError } = await supabase
      .from('fixtures')
      .select(`
        id,
        gameweek,
        home_score,
        away_score,
        finished,
        minutes_played,
        kickoff_time,
        home_team:teams!fixtures_home_team_id_fkey(name, short_name),
        away_team:teams!fixtures_away_team_id_fkey(name, short_name)
      `)
      .eq('gameweek', currentGameweek)
      .order('kickoff_time', { ascending: true });

    return NextResponse.json({
      success: true,
      data: {
        gameweek: currentGameweek,
        fplFixturesTotal: allFplFixtures.length,
        gameweekFixtures: gwFixtures.length,
        teamMappings: teamMapping.size,
        createdFixtures: createdCount,
        errors,
        realFixtures: finalFixtures?.map(f => ({
          match: `${f.home_team?.short_name} vs ${f.away_team?.short_name}`,
          score: f.home_score !== null && f.away_score !== null 
            ? `${f.home_score}-${f.away_score}` 
            : 'vs',
          status: f.finished ? '已结束' : (f.minutes_played > 0 ? '进行中' : '未开始'),
          kickoff: f.kickoff_time
        })) || []
      },
      message: `Successfully synced ${createdCount} real fixtures for gameweek ${currentGameweek}`
    });

  } catch (error) {
    console.error('Real fixtures sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync real fixtures'
    }, { status: 500 });
  }
}