import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/debug-manchester-mapping - Debug Manchester teams mapping
export async function GET(request: NextRequest) {
  try {
    const footballDataKey = process.env.FOOTBALL_DATA_API_KEY;
    
    if (!footballDataKey) {
      return NextResponse.json({
        success: false,
        error: 'FOOTBALL_DATA_API_KEY not configured'
      }, { status: 400 });
    }

    // Get Football-Data.org teams
    const response = await fetch('https://api.football-data.org/v4/competitions/PL/teams?season=2025', {
      headers: { 'X-Auth-Token': footballDataKey }
    });

    if (!response.ok) {
      throw new Error(`Football-Data.org error: ${response.status}`);
    }

    const data = await response.json();
    
    // Focus on Manchester teams
    const manchesterTeams = data.teams.filter(team => 
      team.name.toLowerCase().includes('manchester') || 
      team.tla === 'MCI' || 
      team.tla === 'MUN'
    );

    // Get our database teams
    const { supabase } = await import('@/lib/supabase');
    const { data: dbTeams } = await supabase
      .from('teams')
      .select('id, name, short_name')
      .in('short_name', ['MCI', 'MUN']);

    // Test our current mapping logic
    const testMapping = (teamName: string) => {
      const dbMatch = dbTeams?.find(dbTeam => 
        dbTeam.name.toLowerCase() === teamName.toLowerCase() ||
        dbTeam.name.toLowerCase().includes(teamName.toLowerCase().split(' ')[0]) ||
        teamName.toLowerCase().includes(dbTeam.name.toLowerCase()) ||
        dbTeam.short_name.toLowerCase() === teamName.toLowerCase().substring(0, 3)
      );
      return dbMatch;
    };

    // Test short name mapping specifically
    const testShortNameMapping = (shortName: string) => {
      const dbMatch = dbTeams?.find(dbTeam => 
        dbTeam.short_name.toLowerCase() === shortName.toLowerCase()
      );
      return dbMatch;
    };

    const mappingAnalysis = manchesterTeams.map(fdTeam => ({
      footballDataName: fdTeam.name,
      footballDataShort: fdTeam.tla,
      footballDataId: fdTeam.id,
      nameMapping: testMapping(fdTeam.name),
      shortMapping: testShortNameMapping(fdTeam.tla),
      recommended: dbTeams?.find(db => 
        (db.short_name === 'MCI' && fdTeam.tla === 'MCI') ||
        (db.short_name === 'MUN' && fdTeam.tla === 'MUN')
      )
    }));

    // Also get sample fixtures from Football-Data.org to see what they return
    const fixturesResponse = await fetch('https://api.football-data.org/v4/competitions/PL/matches?season=2025&matchday=1', {
      headers: { 'X-Auth-Token': footballDataKey }
    });

    let sampleFixtures = [];
    if (fixturesResponse.ok) {
      const fixturesData = await fixturesResponse.json();
      sampleFixtures = fixturesData.matches
        ?.filter(match => 
          match.homeTeam.tla === 'MCI' || match.awayTeam.tla === 'MCI' ||
          match.homeTeam.tla === 'MUN' || match.awayTeam.tla === 'MUN'
        )
        .slice(0, 3)
        .map(match => ({
          home: match.homeTeam.name,
          homeShort: match.homeTeam.tla,
          away: match.awayTeam.name,
          awayShort: match.awayTeam.tla,
          status: match.status
        })) || [];
    }

    return NextResponse.json({
      success: true,
      data: {
        footballDataManchesterTeams: manchesterTeams.map(t => ({
          name: t.name,
          tla: t.tla,
          id: t.id
        })),
        databaseManchesterTeams: dbTeams,
        mappingAnalysis,
        sampleFixtures,
        mappingLogicUsed: [
          '1. Exact name match (case insensitive)',
          '2. Database name includes first word of Football-Data name',
          '3. Football-Data name includes database name',  
          '4. First 3 chars of Football-Data name match short_name'
        ]
      }
    });

  } catch (error) {
    console.error('Manchester mapping debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Debug failed'
    }, { status: 500 });
  }
}