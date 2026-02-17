// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/requireAdminAuth';

// GET /api/admin/debug-team-mapping - Debug team name mapping issues
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const footballDataKey = process.env.FOOTBALL_DATA_API_KEY;
    
    if (!footballDataKey) {
      return NextResponse.json({
        success: false,
        error: 'FOOTBALL_DATA_API_KEY not configured'
      }, { status: 400 });
    }

    // Get Football-Data.org team names
    console.log('Fetching team names from Football-Data.org...');
    const response = await fetch('https://api.football-data.org/v4/competitions/PL/teams?season=2025', {
      headers: {
        'X-Auth-Token': footballDataKey
      }
    });

    if (!response.ok) {
      throw new Error(`Football-Data.org error: ${response.status}`);
    }

    const data = await response.json();
    const footballDataTeams = data.teams.map(team => ({
      name: team.name,
      shortName: team.tla,
      id: team.id
    }));

    // Get our database teams
    const { supabase } = await import('@/lib/supabase');
    const { data: dbTeams } = await supabase
      .from('teams')
      .select('id, name, short_name')
      .order('short_name');

    // Analyze mapping
    const mappingAnalysis = [];
    const unmatchedFootballData = [];
    const unmatchedDatabase = [];

    footballDataTeams.forEach(fdTeam => {
      // Current matching logic (simplified)
      const dbMatch = dbTeams?.find(dbTeam => 
        dbTeam.name.toLowerCase() === fdTeam.name.toLowerCase() ||
        dbTeam.name.toLowerCase().includes(fdTeam.name.toLowerCase().split(' ')[0]) ||
        fdTeam.name.toLowerCase().includes(dbTeam.name.toLowerCase()) ||
        dbTeam.short_name.toLowerCase() === fdTeam.shortName.toLowerCase()
      );

      if (dbMatch) {
        mappingAnalysis.push({
          footballDataName: fdTeam.name,
          footballDataShort: fdTeam.shortName,
          databaseName: dbMatch.name,
          databaseShort: dbMatch.short_name,
          databaseId: dbMatch.id,
          matchType: 'SUCCESS'
        });
      } else {
        unmatchedFootballData.push({
          name: fdTeam.name,
          shortName: fdTeam.shortName,
          suggestion: 'No database match found'
        });
      }
    });

    // Find database teams without matches
    dbTeams?.forEach(dbTeam => {
      const hasMatch = mappingAnalysis.find(m => m.databaseId === dbTeam.id);
      if (!hasMatch) {
        unmatchedDatabase.push({
          name: dbTeam.name,
          shortName: dbTeam.short_name,
          id: dbTeam.id
        });
      }
    });

    // Identify duplicate mappings
    const duplicates = {};
    mappingAnalysis.forEach(mapping => {
      if (!duplicates[mapping.databaseId]) {
        duplicates[mapping.databaseId] = [];
      }
      duplicates[mapping.databaseId].push(mapping);
    });

    const duplicateTeams = Object.entries(duplicates)
      .filter(([_, mappings]) => (mappings as any).length > 1)
      .map(([dbId, mappings]) => ({
        databaseTeam: (mappings as any)[0].databaseName,
        mappedTo: (mappings as any).map((m: any) => m.footballDataName)
      }));

    return NextResponse.json({
      success: true,
      data: {
        totalFootballDataTeams: footballDataTeams.length,
        totalDatabaseTeams: dbTeams?.length || 0,
        successfulMappings: mappingAnalysis.length,
        unmatchedFootballData: unmatchedFootballData.length,
        unmatchedDatabase: unmatchedDatabase.length,
        duplicateMappings: duplicateTeams.length,
        analysis: {
          mappingAnalysis: mappingAnalysis.sort((a, b) => a.footballDataName.localeCompare(b.footballDataName)),
          unmatchedFootballData,
          unmatchedDatabase,
          duplicateTeams
        },
        currentMappingLogic: [
          '1. Exact name match (case insensitive)',
          '2. Database name includes first word of Football-Data name',
          '3. Football-Data name includes database name',
          '4. Short name exact match'
        ],
        suggestions: [
          '使用 short_name 作为主键更直观',
          '统一 short_name 格式 (如 MUN, CHE, ARS)',
          '避免 UUID 的复杂性',
          '直接用三字母代码作为表的主键'
        ]
      }
    });

  } catch (error) {
    console.error('Team mapping debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Debug failed'
    }, { status: 500 });
  }
}