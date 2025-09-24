import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fplApi } from '@/lib/fplApi';

// POST /api/sync/fpl - Sync player data from FPL API
export async function POST(request: NextRequest) {
  try {
    console.log('Starting FPL data sync...');
    
    // Get current data from FPL API
    const fplPlayers = await fplApi.getAllPlayers();
    const fplTeams = await fplApi.getAllTeams();
    
    console.log(`Fetched ${fplPlayers.length} players and ${fplTeams.length} teams from FPL API`);

    // Update players with FPL data (optimized with batch operations)
    let updatedCount = 0;
    let newPlayersCount = 0;
    
    console.log(`Processing ${fplPlayers.length} players from FPL API...`);

    // Get existing players to avoid individual lookups
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('id, name, position');

    const existingPlayerMap = new Map();
    existingPlayers?.forEach(player => {
      const key = `${player.name.toLowerCase()}_${player.position}`;
      existingPlayerMap.set(key, player);
    });

    const playersToUpdate = [];
    const playersToInsert = [];

    // Only process players from major teams to reduce processing time
    const majorTeams = [1, 6, 12, 13, 14, 18]; // Arsenal, Chelsea, Liverpool, Man City, Man United, Tottenham
    const relevantPlayers = fplPlayers.filter(player => majorTeams.includes(player.team));
    
    console.log(`Filtering to ${relevantPlayers.length} players from major teams...`);

    for (const fplPlayer of relevantPlayers) {
      const playerName = `${fplPlayer.first_name} ${fplPlayer.second_name}`;
      const position = fplApi.convertPosition(fplPlayer.element_type);
      const price = fplApi.convertPrice(fplPlayer.now_cost);
      const teamShortName = fplApi.getTeamShortName(fplPlayer.team);
      const photoUrl = fplApi.getPlayerPhotoUrl(fplPlayer.photo);

      const playerKey = `${playerName.toLowerCase()}_${position}`;
      const existingPlayer = existingPlayerMap.get(playerKey);

      const playerData = {
        name: playerName,
        position,
        team: teamShortName,                    // Now using team short name directly
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
        updated_at: new Date().toISOString()
      };

      if (existingPlayer) {
        playersToUpdate.push({ ...playerData, id: existingPlayer.id });
      } else {
        playersToInsert.push({ ...playerData, is_available: true });
      }
    }

    // Batch update existing players
    if (playersToUpdate.length > 0) {
      console.log(`Updating ${playersToUpdate.length} existing players...`);
      for (const player of playersToUpdate) {
        const { error } = await supabase
          .from('players')
          .update(player)
          .eq('id', player.id);
        
        if (!error) updatedCount++;
      }
    }

    // Batch insert new players
    if (playersToInsert.length > 0) {
      console.log(`Inserting ${playersToInsert.length} new players...`);
      const { data, error } = await supabase
        .from('players')
        .insert(playersToInsert)
        .select('id');
      
      if (!error && data) {
        newPlayersCount = data.length;
      }
    }

    // Update current gameweek
    const currentGameweek = await fplApi.getCurrentGameweek();
    
    // Sync fixtures for current and next few gameweeks (limited scope to reduce timeout)
    let fixturesCount = 0;
    const gameweeksToSync = [currentGameweek - 1, currentGameweek, currentGameweek + 1].filter(gw => gw >= 1 && gw <= 38);
    
    console.log(`Syncing fixtures for gameweeks: ${gameweeksToSync.join(', ')}`);
    
    for (const gw of gameweeksToSync) {
      try {
        console.log(`Fetching fixtures for gameweek ${gw}...`);
        const fplFixtures = await fplApi.getFixtures(gw);
        console.log(`Found ${fplFixtures.length} fixtures for gameweek ${gw}`);
        
        // Batch insert fixtures to reduce database calls
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
        
        if (fixtureDataBatch.length > 0) {
          // Try upsert first, fallback to checking and inserting individually
          let { data: insertedFixtures, error: fixtureError } = await supabase
            .from('fixtures')
            .upsert(fixtureDataBatch, {
              onConflict: 'unique_fixture_per_gameweek'
            })
            .select('id');
            
          // If constraint doesn't exist, handle manually
          if (fixtureError && fixtureError.code === '42P10') {
            console.log(`Constraint not found, using manual deduplication for gameweek ${gw}`);
            insertedFixtures = [];
            
            for (const fixtureData of fixtureDataBatch) {
              // Check if fixture already exists
              const { data: existingFixture } = await supabase
                .from('fixtures')
                .select('id')
                .eq('gameweek', fixtureData.gameweek)
                .eq('home_team_id', fixtureData.home_team_id)
                .eq('away_team_id', fixtureData.away_team_id)
                .single();
              
              if (existingFixture) {
                // Update existing fixture
                const { error: updateError } = await supabase
                  .from('fixtures')
                  .update(fixtureData)
                  .eq('id', existingFixture.id);
                
                if (!updateError) {
                  insertedFixtures.push(existingFixture);
                }
              } else {
                // Insert new fixture
                const { data: newFixture, error: insertError } = await supabase
                  .from('fixtures')
                  .insert(fixtureData)
                  .select('id')
                  .single();
                
                if (!insertError && newFixture) {
                  insertedFixtures.push(newFixture);
                }
              }
            }
            fixtureError = null; // Clear error since we handled it
          }
            
          if (!fixtureError && insertedFixtures) {
            fixturesCount += insertedFixtures.length;
            console.log(`Successfully synced ${insertedFixtures.length} fixtures for gameweek ${gw}`);
          } else {
            console.error(`Error syncing fixtures for gameweek ${gw}:`, fixtureError);
          }
        }
      } catch (error) {
        console.error(`Error syncing fixtures for gameweek ${gw}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        playersUpdated: updatedCount,
        newPlayers: newPlayersCount,
        totalFplPlayers: fplPlayers.length,
        fixturesSynced: fixturesCount,
        currentGameweek
      },
      message: `Sync completed: ${updatedCount} players updated, ${newPlayersCount} new players, ${fixturesCount} fixtures synced`
    });

  } catch (error) {
    console.error('FPL sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync FPL data'
    }, { status: 500 });
  }
}

// GET /api/sync/fpl - Get sync status
export async function GET() {
  try {
    // Get last sync time from a log table or just return current player count
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });

    const { data: samplePlayer } = await supabase
      .from('players')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        totalPlayers: count,
        lastUpdated: samplePlayer?.updated_at,
        syncAvailable: true
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get sync status'
    }, { status: 500 });
  }
}