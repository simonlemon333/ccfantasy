// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/admin/fix-team-mapping - Fix immediate team mapping issues
export async function POST(request: NextRequest) {
  try {
    console.log('Starting immediate team mapping fixes...');
    
    const fixes = [];
    const errors = [];

    // Fix 1: Update Nottingham Forest name to match Football-Data.org
    console.log('Fixing Nottingham Forest name...');
    const { error: forestError } = await supabase
      .from('teams')
      .update({ name: 'Nottingham Forest' })
      .eq('short_name', 'NFO');

    if (forestError) {
      errors.push(`Failed to update Nottingham Forest: ${forestError.message}`);
    } else {
      fixes.push('✅ Updated "Nott\'m Forest" → "Nottingham Forest"');
    }

    // Fix 2: Update short name to match Football-Data.org
    const { error: forestShortError } = await supabase
      .from('teams')
      .update({ short_name: 'NOT' })
      .eq('name', 'Nottingham Forest');

    if (forestShortError) {
      errors.push(`Failed to update Nottingham Forest short name: ${forestShortError.message}`);
    } else {
      fixes.push('✅ Updated NFO → NOT to match Football-Data.org');
    }

    // Fix 3: Remove teams not in current Premier League
    const teamsToRemove = ['IPS', 'LEI', 'SOU'];
    
    for (const teamShort of teamsToRemove) {
      console.log(`Removing ${teamShort}...`);
      
      // Get team info first
      const { data: teamInfo } = await supabase
        .from('teams')
        .select('name')
        .eq('short_name', teamShort)
        .single();

      if (teamInfo) {
        // Check for dependent records first
        const { data: fixtures } = await supabase
          .from('fixtures')
          .select('id')
          .or(`home_team_id.in.(select id from teams where short_name='${teamShort}'),away_team_id.in.(select id from teams where short_name='${teamShort}')`);

        const { data: players } = await supabase
          .from('players')
          .select('id')
          .eq('team_id', `select id from teams where short_name='${teamShort}'`);

        if (fixtures && fixtures.length > 0) {
          errors.push(`⚠️ Cannot remove ${teamInfo.name} (${teamShort}): ${fixtures.length} fixtures depend on it`);
        } else if (players && players.length > 0) {
          errors.push(`⚠️ Cannot remove ${teamInfo.name} (${teamShort}): ${players.length} players depend on it`);
        } else {
          // Safe to remove
          const { error: deleteError } = await supabase
            .from('teams')
            .delete()
            .eq('short_name', teamShort);

          if (deleteError) {
            errors.push(`Failed to remove ${teamInfo.name}: ${deleteError.message}`);
          } else {
            fixes.push(`✅ Removed ${teamInfo.name} (${teamShort}) - not in current Premier League`);
          }
        }
      }
    }

    // Fix 4: Verify final team count
    const { data: finalTeams } = await supabase
      .from('teams')
      .select('short_name, name')
      .order('short_name');

    console.log(`Final team count: ${finalTeams?.length || 0}`);

    // Fix 5: Test the mapping after fixes
    const footballDataKey = process.env.FOOTBALL_DATA_API_KEY;
    let mappingTestResult = null;

    if (footballDataKey) {
      try {
        const response = await fetch('https://api.football-data.org/v4/competitions/PL/teams?season=2025', {
          headers: { 'X-Auth-Token': footballDataKey }
        });

        if (response.ok) {
          const data = await response.json();
          const footballDataTeams = data.teams;
          
          const mappingResults = footballDataTeams.map(fdTeam => {
            const dbMatch = finalTeams?.find(dbTeam => 
              dbTeam.name.toLowerCase() === fdTeam.name.toLowerCase() ||
              dbTeam.name.toLowerCase().includes(fdTeam.name.toLowerCase().split(' ')[0]) ||
              fdTeam.name.toLowerCase().includes(dbTeam.name.toLowerCase()) ||
              dbTeam.short_name.toLowerCase() === fdTeam.tla.toLowerCase()
            );

            return {
              footballData: `${fdTeam.name} (${fdTeam.tla})`,
              database: dbMatch ? `${dbMatch.name} (${dbMatch.short_name})` : '❌ NO MATCH',
              success: !!dbMatch
            };
          });

          const successCount = mappingResults.filter(r => r.success).length;
          mappingTestResult = {
            totalFootballDataTeams: footballDataTeams.length,
            totalDatabaseTeams: finalTeams?.length || 0,
            successfulMappings: successCount,
            unmatchedCount: footballDataTeams.length - successCount,
            results: mappingResults
          };
        }
      } catch (error) {
        console.warn('Could not test mapping:', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        fixesApplied: fixes.length,
        fixes,
        errors: errors.length > 0 ? errors : undefined,
        finalTeamCount: finalTeams?.length || 0,
        mappingTest: mappingTestResult,
        nextSteps: [
          '1. Run restore-full-fixtures to update fixtures with new mapping',
          '2. Consider full refactor to short_name primary keys for better UX',
          '3. Remove remaining non-Premier League teams if safe'
        ]
      },
      message: `✅ Applied ${fixes.length} team mapping fixes${errors.length > 0 ? ` with ${errors.length} issues` : ''}`
    });

  } catch (error) {
    console.error('Team mapping fix error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Team mapping fixes failed'
    }, { status: 500 });
  }
}

// GET /api/admin/fix-team-mapping - Preview what fixes would be applied
export async function GET(request: NextRequest) {
  try {
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, short_name')
      .order('short_name');

    const proposedFixes = [
      {
        type: 'NAME_UPDATE',
        current: 'Nott\'m Forest (NFO)',
        proposed: 'Nottingham Forest (NOT)', 
        reason: 'Match Football-Data.org name format'
      }
    ];

    const teamsToRemove = ['IPS', 'LEI', 'SOU'];
    teams?.forEach(team => {
      if (teamsToRemove.includes(team.short_name)) {
        proposedFixes.push({
          type: 'REMOVAL',
          current: `${team.name} (${team.short_name})`,
          proposed: 'DELETE',
          reason: 'Not in current Premier League season'
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        currentTeams: teams?.length || 0,
        proposedFixes,
        expectedFinalCount: (teams?.length || 0) - teamsToRemove.length,
        expectedMappingImprovement: 'Should fix Nottingham Forest mapping issue'
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Preview failed'
    }, { status: 500 });
  }
}