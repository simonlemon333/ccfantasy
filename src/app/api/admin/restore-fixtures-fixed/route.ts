// @ts-nocheck
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/requireAdminAuth';

// POST /api/admin/restore-fixtures-fixed - Restore fixtures with improved team mapping
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  try {
    console.log('Starting fixtures restoration with improved mapping...');

    const { useFootballData = true } = await request.json();
    const footballDataKey = process.env.FOOTBALL_DATA_API_KEY;
    
    if (!footballDataKey) {
      return NextResponse.json({
        success: false,
        error: 'FOOTBALL_DATA_API_KEY not configured'
      }, { status: 400 });
    }

    // Get Football-Data.org fixtures
    console.log('Fetching complete season from Football-Data.org...');
    const response = await fetch('https://api.football-data.org/v4/competitions/PL/matches?season=2025', {
      headers: { 'X-Auth-Token': footballDataKey }
    });

    if (!response.ok) {
      throw new Error(`Football-Data.org error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.count} total matches from Football-Data.org`);

    // Get our database teams for mapping
    const { data: dbTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, short_name')
      .order('short_name');

    if (teamsError) {
      throw new Error(`Failed to get teams: ${teamsError.message}`);
    }

    console.log(`Database teams: ${dbTeams?.length}`);

    // Create improved team mapping function
    const findTeamId = (teamName: string, teamShortName?: string) => {
      // Priority 1: Direct short name match (most reliable)
      if (teamShortName) {
        const team = dbTeams?.find(t => t.short_name.toLowerCase() === teamShortName.toLowerCase());
        if (team) {
          console.log(`✅ Mapped ${teamName} (${teamShortName}) → ${team.name} (${team.short_name})`);
          return team.id;
        }
      }
      
      // Priority 2: Exact name match
      let team = dbTeams?.find(t => t.name.toLowerCase() === teamName.toLowerCase());
      if (team) {
        console.log(`✅ Mapped ${teamName} → ${team.name} (exact name)`);
        return team.id;
      }
      
      // Priority 3: Partial name match
      team = dbTeams?.find(t => 
        teamName.toLowerCase().includes(t.name.toLowerCase()) ||
        t.name.toLowerCase().includes(teamName.toLowerCase().split(' ')[0])
      );
      if (team) {
        console.log(`✅ Mapped ${teamName} → ${team.name} (partial)`);
        return team.id;
      }
      
      // Priority 4: Short name contained in team name
      team = dbTeams?.find(t => 
        teamName.toLowerCase().includes(t.short_name.toLowerCase())
      );
      if (team) {
        console.log(`✅ Mapped ${teamName} → ${team.name} (short name in name)`);
        return team.id;
      }

      console.warn(`❌ No mapping found for: ${teamName} (${teamShortName || 'no short name'})`);
      return null;
    };

    // Process fixtures with improved mapping
    let insertedCount = 0;
    let skippedCount = 0;
    const mappingIssues = [];

    // Clear existing fixtures
    console.log('Clearing existing fixtures...');
    await supabase.from('fixtures').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Process fixtures in batches
    const batchSize = 50;
    console.log(`Processing ${data.matches.length} fixtures in batches of ${batchSize}...`);

    for (let i = 0; i < data.matches.length; i += batchSize) {
      const batch = data.matches.slice(i, i + batchSize);
      const processedBatch = [];

      for (const match of batch) {
        // Use both team name and short name for better mapping
        const homeTeamId = findTeamId(match.homeTeam.name, match.homeTeam.tla);
        const awayTeamId = findTeamId(match.awayTeam.name, match.awayTeam.tla);

        if (homeTeamId && awayTeamId) {
          processedBatch.push({
            gameweek: match.matchday,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            home_score: match.score.fullTime.home,
            away_score: match.score.fullTime.away,
            finished: match.status === 'FINISHED',
            minutes_played: match.status === 'FINISHED' ? 90 : 0,
            kickoff_time: match.utcDate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } else {
          skippedCount++;
          mappingIssues.push({
            homeTeam: `${match.homeTeam.name} (${match.homeTeam.tla})`,
            awayTeam: `${match.awayTeam.name} (${match.awayTeam.tla})`,
            homeTeamMapped: !!homeTeamId,
            awayTeamMapped: !!awayTeamId,
            gameweek: match.matchday
          });
        }
      }

      if (processedBatch.length > 0) {
        const { error: insertError } = await supabase
          .from('fixtures')
          .insert(processedBatch);

        if (insertError) {
          throw new Error(`Batch insert error: ${insertError.message}`);
        }
        
        insertedCount += processedBatch.length;
        console.log(`Batch ${Math.floor(i/batchSize) + 1}: Inserted ${processedBatch.length} fixtures (Total: ${insertedCount})`);
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

    // Check for Manchester teams specifically
    const manchesterFixtures = finalFixtures?.filter(f => 
      f.home_team?.short_name === 'MCI' || f.away_team?.short_name === 'MCI' ||
      f.home_team?.short_name === 'MUN' || f.away_team?.short_name === 'MUN'
    ) || [];

    // Get team fixture counts
    const teamFixtureCounts = {};
    finalFixtures?.forEach(f => {
      const homeTeam = f.home_team?.short_name;
      const awayTeam = f.away_team?.short_name;
      if (homeTeam) teamFixtureCounts[homeTeam] = (teamFixtureCounts[homeTeam] || 0) + 1;
      if (awayTeam) teamFixtureCounts[awayTeam] = (teamFixtureCounts[awayTeam] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        totalFixturesFound: data.matches.length,
        fixturesInserted: insertedCount,
        fixturesSkipped: skippedCount,
        manchesterFixtures: manchesterFixtures.length,
        manchesterSample: manchesterFixtures.slice(0, 5).map(f => ({
          gameweek: f.gameweek,
          match: `${f.home_team?.short_name} vs ${f.away_team?.short_name}`,
          finished: f.finished
        })),
        teamFixtureCounts,
        mappingIssues: mappingIssues.slice(0, 10), // Show first 10 issues
        totalMappingIssues: mappingIssues.length
      },
      message: `✅ Fixed fixtures restoration: ${insertedCount} fixtures (${skippedCount} skipped). Manchester teams: ${manchesterFixtures.length} fixtures`
    });

  } catch (error) {
    console.error('Fixed fixtures restoration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Fixtures restoration failed'
    }, { status: 500 });
  }
}