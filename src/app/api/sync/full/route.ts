import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fplApi } from '@/lib/fplApi';

// POST /api/sync/full - Full sync with all players and fixtures
export async function POST(request: NextRequest) {
  try {
    console.log('Starting FULL FPL data sync...');
    
    const results = {
      playersUpdated: 0,
      newPlayers: 0,
      teamsUpdated: 0,
      fixturesSynced: 0,
      currentGameweek: 1,
      errors: []
    };

    // Step 1: Sync teams first (this is critical for player/fixture mapping)
    console.log('Step 1: Syncing teams...');
    try {
      const fplTeams = await fplApi.getAllTeams();
      console.log(`Fetched ${fplTeams.length} teams from FPL API`);

      for (const fplTeam of fplTeams) {
        const teamData = {
          name: fplTeam.name,
          short_name: fplTeam.short_name,
          primary_color: '#000000', // Default color
          secondary_color: '#FFFFFF'
        };

        // Try to find existing team by short_name
        const { data: existingTeam } = await supabase
          .from('teams')
          .select('id')
          .eq('short_name', fplTeam.short_name)
          .single();

        if (existingTeam) {
          // Update existing team
          const { error } = await supabase
            .from('teams')
            .update(teamData)
            .eq('id', existingTeam.id);
          
          if (!error) {
            // Update the team mapping in fplApi
            fplApi.updateTeamMapping(fplTeam.id, existingTeam.id);
            results.teamsUpdated++;
          }
        } else {
          // Insert new team
          const { data: newTeam, error } = await supabase
            .from('teams')
            .insert(teamData)
            .select('id')
            .single();
          
          if (!error && newTeam) {
            // Update the team mapping in fplApi
            fplApi.updateTeamMapping(fplTeam.id, newTeam.id);
            results.teamsUpdated++;
          }
        }
      }
      
      console.log(`Teams sync completed: ${results.teamsUpdated} teams processed`);
    } catch (error) {
      console.error('Error syncing teams:', error);
      results.errors.push(`Teams sync failed: ${error.message}`);
    }

    // Step 2: Sync ALL players (not just major teams)
    console.log('Step 2: Syncing all players...');
    try {
      const fplPlayers = await fplApi.getAllPlayers();
      console.log(`Fetched ${fplPlayers.length} players from FPL API`);

      // Get existing players to avoid individual lookups
      const { data: existingPlayers } = await supabase
        .from('players')
        .select('id, name, position');

      const existingPlayerMap = new Map();
      existingPlayers?.forEach(player => {
        const key = `${player.name.toLowerCase()}_${player.position}`;
        existingPlayerMap.set(key, player);
      });

      // Process players in batches to avoid memory issues
      const BATCH_SIZE = 50;
      for (let i = 0; i < fplPlayers.length; i += BATCH_SIZE) {
        const batch = fplPlayers.slice(i, i + BATCH_SIZE);
        const playersToUpdate = [];
        const playersToInsert = [];

        for (const fplPlayer of batch) {
          const playerName = `${fplPlayer.first_name} ${fplPlayer.second_name}`;
          const position = fplApi.convertPosition(fplPlayer.element_type);
          const price = fplApi.convertPrice(fplPlayer.now_cost);
          const teamUuid = fplApi.mapTeamToUuid(fplPlayer.team);
          const photoUrl = fplApi.getPlayerPhotoUrl(fplPlayer.photo);

          const playerKey = `${playerName.toLowerCase()}_${position}`;
          const existingPlayer = existingPlayerMap.get(playerKey);

          const playerData = {
            name: playerName,
            position,
            team_id: teamUuid,
            price,
            total_points: fplPlayer.total_points,
            form: parseFloat(fplPlayer.form) || 0,
            selected_by_percent: parseFloat(fplPlayer.selected_by_percent) || 0,
            goals: fplPlayer.goals_scored,
            assists: fplPlayer.assists,
            clean_sheets: fplPlayer.clean_sheets,
            yellow_cards: fplPlayer.yellow_cards,
            red_cards: fplPlayer.red_cards,
            saves: fplPlayer.saves,
            bonus_points: fplPlayer.bonus,
            photo_url: photoUrl,
            is_available: true,
            updated_at: new Date().toISOString()
          };

          if (existingPlayer) {
            playersToUpdate.push({ ...playerData, id: existingPlayer.id });
          } else {
            playersToInsert.push(playerData);
          }
        }

        // Batch update
        for (const player of playersToUpdate) {
          const { error } = await supabase
            .from('players')
            .update(player)
            .eq('id', player.id);
          
          if (!error) results.playersUpdated++;
        }

        // Batch insert
        if (playersToInsert.length > 0) {
          const { data, error } = await supabase
            .from('players')
            .insert(playersToInsert)
            .select('id');
          
          if (!error && data) {
            results.newPlayers += data.length;
          }
        }

        console.log(`Processed batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(fplPlayers.length/BATCH_SIZE)}: ${batch.length} players`);
      }

      console.log(`Players sync completed: ${results.playersUpdated} updated, ${results.newPlayers} new`);
    } catch (error) {
      console.error('Error syncing players:', error);
      results.errors.push(`Players sync failed: ${error.message}`);
    }

    // Step 3: Get current gameweek
    try {
      results.currentGameweek = await fplApi.getCurrentGameweek();
      console.log(`Current gameweek: ${results.currentGameweek}`);
    } catch (error) {
      console.error('Error getting current gameweek:', error);
      results.errors.push(`Gameweek fetch failed: ${error.message}`);
    }

    // Step 4: Sync fixtures for multiple gameweeks
    console.log('Step 4: Syncing fixtures...');
    try {
      const gameweeksToSync = [];
      for (let gw = 1; gw <= Math.min(38, results.currentGameweek + 10); gw++) {
        gameweeksToSync.push(gw);
      }
      
      console.log(`Syncing fixtures for gameweeks: ${gameweeksToSync.slice(0, 5).join(', ')}${gameweeksToSync.length > 5 ? '...' : ''}`);
      
      for (const gw of gameweeksToSync) {
        try {
          const fplFixtures = await fplApi.getFixtures(gw);
          
          if (fplFixtures.length > 0) {
            const fixtureDataBatch = fplFixtures.map(fplFixture => ({
              gameweek: fplFixture.event,
              home_team_id: fplApi.mapTeamToUuid(fplFixture.team_h),
              away_team_id: fplApi.mapTeamToUuid(fplFixture.team_a),
              kickoff_time: fplFixture.kickoff_time,
              home_score: fplFixture.team_h_score || null,
              away_score: fplFixture.team_a_score || null,
              finished: fplFixture.finished,
              minutes_played: fplFixture.minutes
            }));
            
            const { data: insertedFixtures, error: fixtureError } = await supabase
              .from('fixtures')
              .upsert(fixtureDataBatch, {
                onConflict: 'unique_fixture_per_gameweek'
              })
              .select('id');
              
            if (!fixtureError && insertedFixtures) {
              results.fixturesSynced += insertedFixtures.length;
            }
          }
          
          // Small delay to avoid rate limiting
          if (gw % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Error syncing fixtures for gameweek ${gw}:`, error);
          results.errors.push(`Fixtures GW${gw} failed: ${error.message}`);
        }
      }

      console.log(`Fixtures sync completed: ${results.fixturesSynced} fixtures synced`);
    } catch (error) {
      console.error('Error syncing fixtures:', error);
      results.errors.push(`Fixtures sync failed: ${error.message}`);
    }

    const message = results.errors.length > 0 ? 
      `Sync completed with some errors: ${results.errors.length} issues` :
      'Full sync completed successfully';

    return NextResponse.json({
      success: true,
      data: results,
      message
    });

  } catch (error) {
    console.error('Full FPL sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync FPL data'
    }, { status: 500 });
  }
}