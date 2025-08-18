import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fplApi } from '@/lib/fplApi';

// POST /api/sync/teams - Fix team mapping and sync fixtures
export async function POST(request: NextRequest) {
  try {
    console.log('Starting team mapping fix and fixture sync...');
    
    const results = {
      teamsFixed: 0,
      fixturesSynced: 0,
      errors: []
    };

    // Step 1: Get FPL teams and fix mapping
    const fplTeams = await fplApi.getAllTeams();
    const { data: dbTeams } = await supabase
      .from('teams')
      .select('id, name, short_name');

    console.log(`Found ${fplTeams.length} FPL teams and ${dbTeams?.length} database teams`);

    // Premier League team colors and logos
    const teamAssets = {
      'ARS': { primary: '#EF0107', secondary: '#FFFFFF', logo: 'https://resources.premierleague.com/premierleague/badges/25/t3.png' },
      'AVL': { primary: '#95BFE5', secondary: '#F0E68C', logo: 'https://resources.premierleague.com/premierleague/badges/25/t7.png' },
      'BOU': { primary: '#DA020E', secondary: '#000000', logo: 'https://resources.premierleague.com/premierleague/badges/25/t91.png' },
      'BRE': { primary: '#FF0000', secondary: '#FFFFFF', logo: 'https://resources.premierleague.com/premierleague/badges/25/t94.png' },
      'BHA': { primary: '#0057B8', secondary: '#FFFFFF', logo: 'https://resources.premierleague.com/premierleague/badges/25/t36.png' },
      'CHE': { primary: '#034694', secondary: '#FFFFFF', logo: 'https://resources.premierleague.com/premierleague/badges/25/t8.png' },
      'CRY': { primary: '#1B458F', secondary: '#A7A5A6', logo: 'https://resources.premierleague.com/premierleague/badges/25/t31.png' },
      'EVE': { primary: '#003399', secondary: '#FFFFFF', logo: 'https://resources.premierleague.com/premierleague/badges/25/t11.png' },
      'FUL': { primary: '#FFFFFF', secondary: '#000000', logo: 'https://resources.premierleague.com/premierleague/badges/25/t54.png' },
      'IPS': { primary: '#4C9DDB', secondary: '#FFFFFF', logo: 'https://resources.premierleague.com/premierleague/badges/25/t40.png' },
      'LEI': { primary: '#003090', secondary: '#FDBE11', logo: 'https://resources.premierleague.com/premierleague/badges/25/t13.png' },
      'LIV': { primary: '#C8102E', secondary: '#F6EB61', logo: 'https://resources.premierleague.com/premierleague/badges/25/t14.png' },
      'MCI': { primary: '#6CABDD', secondary: '#FFFFFF', logo: 'https://resources.premierleague.com/premierleague/badges/25/t43.png' },
      'MUN': { primary: '#DA020E', secondary: '#FBE122', logo: 'https://resources.premierleague.com/premierleague/badges/25/t1.png' },
      'NEW': { primary: '#241F20', secondary: '#FFFFFF', logo: 'https://resources.premierleague.com/premierleague/badges/25/t4.png' },
      'NFO': { primary: '#DD0000', secondary: '#FFFFFF', logo: 'https://resources.premierleague.com/premierleague/badges/25/t17.png' },
      'SOU': { primary: '#D71920', secondary: '#FFC20E', logo: 'https://resources.premierleague.com/premierleague/badges/25/t20.png' },
      'TOT': { primary: '#132257', secondary: '#FFFFFF', logo: 'https://resources.premierleague.com/premierleague/badges/25/t6.png' },
      'WHU': { primary: '#7A263A', secondary: '#1BB1E7', logo: 'https://resources.premierleague.com/premierleague/badges/25/t21.png' },
      'WOL': { primary: '#FDB462', secondary: '#231F20', logo: 'https://resources.premierleague.com/premierleague/badges/25/t39.png' }
    };

    // Create mapping by matching short names and update team assets
    for (const fplTeam of fplTeams) {
      const dbTeam = dbTeams?.find(team => 
        team.short_name.toLowerCase() === fplTeam.short_name.toLowerCase()
      );
      
      if (dbTeam) {
        fplApi.updateTeamMapping(fplTeam.id, dbTeam.id);
        
        // Update team with logo and colors
        const assets = teamAssets[fplTeam.short_name as keyof typeof teamAssets];
        if (assets) {
          const { error: updateError } = await supabase
            .from('teams')
            .update({
              name: fplTeam.name,
              primary_color: assets.primary,
              secondary_color: assets.secondary,
              logo_url: assets.logo
            })
            .eq('id', dbTeam.id);
          
          if (updateError) {
            console.error(`Error updating team ${fplTeam.short_name}:`, updateError);
          }
        }
        
        results.teamsFixed++;
        console.log(`Mapped FPL ${fplTeam.short_name} (${fplTeam.id}) -> DB ${dbTeam.id}`);
      } else {
        console.warn(`No DB team found for FPL team: ${fplTeam.short_name}`);
        results.errors.push(`Missing team: ${fplTeam.short_name}`);
      }
    }

    // Step 2: Get current gameweek
    const currentGameweek = await fplApi.getCurrentGameweek();
    console.log(`Current gameweek: ${currentGameweek}`);

    // Step 3: Sync fixtures for current gameweek
    try {
      const fplFixtures = await fplApi.getFixtures(currentGameweek);
      console.log(`Found ${fplFixtures.length} fixtures for gameweek ${currentGameweek}`);

      if (fplFixtures.length > 0) {
        const fixtureDataBatch = fplFixtures.map(fplFixture => {
          const homeTeamUuid = fplApi.mapTeamToUuid(fplFixture.team_h);
          const awayTeamUuid = fplApi.mapTeamToUuid(fplFixture.team_a);
          
          console.log(`Fixture: FPL team ${fplFixture.team_h} -> ${homeTeamUuid}, FPL team ${fplFixture.team_a} -> ${awayTeamUuid}`);
          
          return {
            gameweek: fplFixture.event,
            home_team_id: homeTeamUuid,
            away_team_id: awayTeamUuid,
            kickoff_time: fplFixture.kickoff_time,
            home_score: fplFixture.team_h_score || null,
            away_score: fplFixture.team_a_score || null,
            finished: fplFixture.finished,
            minutes_played: fplFixture.minutes
          };
        });

        // Insert fixtures one by one to see which ones fail
        for (const fixtureData of fixtureDataBatch) {
          try {
            // Check if fixture exists
            const { data: existingFixture } = await supabase
              .from('fixtures')
              .select('id')
              .eq('gameweek', fixtureData.gameweek)
              .eq('home_team_id', fixtureData.home_team_id)
              .eq('away_team_id', fixtureData.away_team_id)
              .single();

            if (existingFixture) {
              // Update existing
              const { error: updateError } = await supabase
                .from('fixtures')
                .update(fixtureData)
                .eq('id', existingFixture.id);
              
              if (!updateError) {
                results.fixturesSynced++;
              } else {
                console.error('Update error:', updateError);
                results.errors.push(`Update failed: ${updateError.message}`);
              }
            } else {
              // Insert new
              const { error: insertError } = await supabase
                .from('fixtures')
                .insert(fixtureData);
              
              if (!insertError) {
                results.fixturesSynced++;
              } else {
                console.error('Insert error:', insertError);
                results.errors.push(`Insert failed: ${insertError.message}`);
              }
            }
          } catch (error) {
            console.error('Error processing fixture:', error);
            results.errors.push(`Fixture error: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing fixtures:', error);
      results.errors.push(`Fixtures sync failed: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Team mapping fix completed: ${results.teamsFixed} teams mapped, ${results.fixturesSynced} fixtures synced`
    });

  } catch (error) {
    console.error('Team sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fix team mapping'
    }, { status: 500 });
  }
}