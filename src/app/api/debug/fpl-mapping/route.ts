import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fplApi } from '@/lib/fplApi';

// GET /api/debug/fpl-mapping - Debug team mapping issues
export async function GET() {
  try {
    console.log('Debugging FPL team mapping...');

    // Get FPL teams
    const fplTeams = await fplApi.getAllTeams();
    console.log('FPL teams:', fplTeams.slice(0, 3));

    // Get our database teams
    const { data: dbTeams } = await supabase
      .from('teams')
      .select('id, name, short_name')
      .order('short_name');

    // Get current mapping
    const currentMapping = fplApi.getTeamMapping();

    // Check a sample fixture from FPL API
    const sampleFixtures = await fplApi.getFixtures(1);
    console.log('Sample FPL fixtures:', sampleFixtures.slice(0, 2));

    // Analyze mapping issues
    const mappingAnalysis = fplTeams.map(fplTeam => {
      const mappedUuid = fplApi.mapTeamToUuid(fplTeam.id);
      const dbTeam = dbTeams?.find(team => team.id === mappedUuid);
      const dbTeamByShortName = dbTeams?.find(team => team.short_name === fplTeam.short_name);
      
      return {
        fpl_id: fplTeam.id,
        fpl_name: fplTeam.name,
        fpl_short_name: fplTeam.short_name,
        mapped_uuid: mappedUuid,
        db_team_found: !!dbTeam,
        db_team_by_shortname: dbTeamByShortName?.name || null,
        mapping_issue: !dbTeam && !dbTeamByShortName
      };
    });

    const mappingIssues = mappingAnalysis.filter(item => item.mapping_issue);

    return NextResponse.json({
      success: true,
      data: {
        fpl_teams_count: fplTeams.length,
        db_teams_count: dbTeams?.length || 0,
        sample_fpl_fixtures: sampleFixtures.slice(0, 2),
        current_mapping: currentMapping,
        mapping_analysis: mappingAnalysis,
        mapping_issues: mappingIssues,
        recommendations: [
          mappingIssues.length > 0 ? 
            `❌ ${mappingIssues.length} 个团队映射问题` : 
            '✅ 团队映射正常',
          sampleFixtures.length === 0 ? 
            '❌ FPL API 没有返回赛程数据' : 
            `✅ FPL API 返回了 ${sampleFixtures.length} 个赛程`
        ]
      }
    });

  } catch (error) {
    console.error('FPL mapping debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to debug FPL mapping'
    }, { status: 500 });
  }
}