// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/admin/restore-full-fixtures - Restore complete Premier League fixtures for all 38 gameweeks
export async function POST(request: NextRequest) {
  try {
    console.log('Starting full fixtures restoration...');

    const { useFootballData = false } = await request.json();
    const footballDataKey = process.env.FOOTBALL_DATA_API_KEY;
    
    let allFixtures = [];
    let dataSource = 'FPL';
    const errors = [];
    let totalGameweeks = 0;

    if (useFootballData && footballDataKey) {
      // Use Football-Data.org for complete season data
      try {
        console.log('Fetching complete season from Football-Data.org...');
        
        const response = await fetch('https://api.football-data.org/v4/competitions/PL/matches?season=2025', {
          headers: {
            'X-Auth-Token': footballDataKey
          }
        });

        if (response.ok) {
          const data = await response.json();
          dataSource = 'Football-Data.org';
          
          console.log(`Found ${data.count} total matches from Football-Data.org`);
          
          // Group matches by matchday (equivalent to gameweek)
          const fixturesByGameweek = {};
          
          data.matches.forEach(match => {
            const gameweek = match.matchday;
            if (!fixturesByGameweek[gameweek]) {
              fixturesByGameweek[gameweek] = [];
            }
            
            fixturesByGameweek[gameweek].push({
              gameweek: gameweek,
              homeTeamName: match.homeTeam.name,
              awayTeamName: match.awayTeam.name,
              home_score: match.score.fullTime.home,
              away_score: match.score.fullTime.away,
              finished: match.status === 'FINISHED',
              minutes_played: match.status === 'FINISHED' ? 90 : 0,
              kickoff_time: match.utcDate,
              footballDataId: match.id
            });
          });
          
          totalGameweeks = Object.keys(fixturesByGameweek).length;
          allFixtures = Object.values(fixturesByGameweek).flat();
          
          console.log(`Organized into ${totalGameweeks} gameweeks`);
        } else {
          throw new Error(`Football-Data.org error: ${response.status}`);
        }
      } catch (error) {
        console.error('Football-Data.org failed:', error);
        errors.push(`Football-Data.org: ${error.message}`);
      }
    }

    // Fallback to FPL API for all gameweeks
    if (allFixtures.length === 0) {
      try {
        console.log('Fetching from FPL API for all gameweeks...');
        dataSource = 'FPL';
        
        // Fetch all fixtures from FPL (no gameweek filter)
        const response = await fetch('https://fantasy.premierleague.com/api/fixtures/');
        
        if (response.ok) {
          const fplFixtures = await response.json();
          console.log(`Found ${fplFixtures.length} total fixtures from FPL`);
          
          // Get teams data for mapping
          const teamsResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
          const teamsData = await teamsResponse.json();
          const fplTeams = teamsData.teams;
          
          const gameweeks = new Set();
          
          allFixtures = fplFixtures.map(fixture => {
            gameweeks.add(fixture.event);
            
            const homeTeam = fplTeams.find(t => t.id === fixture.team_h);
            const awayTeam = fplTeams.find(t => t.id === fixture.team_a);
            
            return {
              gameweek: fixture.event,
              homeTeamName: homeTeam?.name || `Team ${fixture.team_h}`,
              awayTeamName: awayTeam?.name || `Team ${fixture.team_a}`,
              home_score: fixture.team_h_score,
              away_score: fixture.team_a_score,
              finished: fixture.finished,
              minutes_played: fixture.minutes || 0,
              kickoff_time: fixture.kickoff_time,
              fplTeamH: fixture.team_h,
              fplTeamA: fixture.team_a
            };
          });
          
          totalGameweeks = gameweeks.size;
          console.log(`Found fixtures for ${totalGameweeks} gameweeks`);
        } else {
          throw new Error(`FPL API error: ${response.status}`);
        }
      } catch (error) {
        console.error('FPL API also failed:', error);
        errors.push(`FPL API: ${error.message}`);
      }
    }

    if (allFixtures.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No fixtures data available from any source',
        errors
      }, { status: 500 });
    }

    // Get our database teams for mapping
    const { data: dbTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, short_name');

    if (teamsError) {
      throw new Error(`Failed to get teams: ${teamsError.message}`);
    }

    // Create team name mapping function
    const findTeamId = (teamName: string) => {
      // Try exact match first
      let team = dbTeams?.find(t => t.name.toLowerCase() === teamName.toLowerCase());
      if (team) return team.id;
      
      // Try partial match
      team = dbTeams?.find(t => 
        teamName.toLowerCase().includes(t.name.toLowerCase()) ||
        t.name.toLowerCase().includes(teamName.toLowerCase().split(' ')[0])
      );
      if (team) return team.id;
      
      // Try short name match
      team = dbTeams?.find(t => 
        teamName.toLowerCase().includes(t.short_name.toLowerCase()) ||
        t.short_name.toLowerCase() === teamName.toLowerCase().substring(0, 3)
      );
      
      return team?.id || null;
    };

    // Clear existing fixtures
    console.log('Clearing existing fixtures...');
    const { error: deleteError } = await supabase
      .from('fixtures')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.warn('Error clearing fixtures:', deleteError);
    }

    // Insert fixtures in batches
    console.log(`Inserting ${allFixtures.length} fixtures...`);
    let insertedCount = 0;
    let skippedCount = 0;
    const batchSize = 50;

    for (let i = 0; i < allFixtures.length; i += batchSize) {
      const batch = allFixtures.slice(i, i + batchSize);
      const processedBatch = [];

      for (const fixture of batch) {
        const homeTeamId = findTeamId(fixture.homeTeamName);
        const awayTeamId = findTeamId(fixture.awayTeamName);

        if (homeTeamId && awayTeamId) {
          processedBatch.push({
            gameweek: fixture.gameweek,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            home_score: fixture.home_score,
            away_score: fixture.away_score,
            finished: fixture.finished,
            minutes_played: fixture.minutes_played,
            kickoff_time: fixture.kickoff_time,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } else {
          skippedCount++;
          console.warn(`Skipped fixture: ${fixture.homeTeamName} vs ${fixture.awayTeamName} (no team mapping)`);
        }
      }

      if (processedBatch.length > 0) {
        const { error: insertError } = await supabase
          .from('fixtures')
          .insert(processedBatch);

        if (insertError) {
          console.error('Batch insert error:', insertError);
          errors.push(`Batch insert error: ${insertError.message}`);
        } else {
          insertedCount += processedBatch.length;
          console.log(`Inserted batch: ${insertedCount}/${allFixtures.length - skippedCount} fixtures`);
        }
      }
    }

    // Get final statistics
    const { data: finalFixtures } = await supabase
      .from('fixtures')
      .select(`
        gameweek,
        home_team:teams!fixtures_home_team_id_fkey(name, short_name),
        away_team:teams!fixtures_away_team_id_fkey(name, short_name),
        finished,
        home_score,
        away_score
      `)
      .order('gameweek, kickoff_time');

    const gameweekStats = {};
    finalFixtures?.forEach(f => {
      if (!gameweekStats[f.gameweek]) {
        gameweekStats[f.gameweek] = { total: 0, finished: 0, withScores: 0 };
      }
      gameweekStats[f.gameweek].total++;
      if (f.finished) gameweekStats[f.gameweek].finished++;
      if (f.home_score !== null && f.away_score !== null) gameweekStats[f.gameweek].withScores++;
    });

    return NextResponse.json({
      success: true,
      data: {
        dataSource,
        totalGameweeks,
        totalFixturesFound: allFixtures.length,
        fixturesInserted: insertedCount,
        fixturesSkipped: skippedCount,
        gameweekStats,
        sampleFixtures: finalFixtures?.slice(0, 5).map(f => ({
          gameweek: f.gameweek,
          match: `${f.home_team?.short_name} vs ${f.away_team?.short_name}`,
          finished: f.finished,
          score: f.home_score !== null && f.away_score !== null ? `${f.home_score}-${f.away_score}` : 'TBD'
        })),
        errors: errors.length > 0 ? errors : undefined
      },
      message: `✅ Fixtures restored: ${insertedCount} fixtures across ${Object.keys(gameweekStats).length} gameweeks from ${dataSource}`
    });

  } catch (error) {
    console.error('Full fixtures restoration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Fixtures restoration failed',
      troubleshooting: [
        'Check if FOOTBALL_DATA_API_KEY is configured for enhanced coverage',
        'Verify FPL API is accessible',
        'Check team mappings in database',
        'Review console logs for detailed errors'
      ]
    }, { status: 500 });
  }
}