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

    // Update players with FPL data
    let updatedCount = 0;
    let newPlayersCount = 0;

    for (const fplPlayer of fplPlayers) {
      const playerName = `${fplPlayer.first_name} ${fplPlayer.second_name}`;
      const position = fplApi.convertPosition(fplPlayer.element_type);
      const price = fplApi.convertPrice(fplPlayer.now_cost);
      const teamUuid = fplApi.mapTeamToUuid(fplPlayer.team);
      const photoUrl = fplApi.getPlayerPhotoUrl(fplPlayer.photo);

      // Check if player exists in our database
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id, name')
        .ilike('name', `%${fplPlayer.second_name}%`)
        .eq('position', position)
        .single();

      if (existingPlayer) {
        // Update existing player
        const { error: updateError } = await supabase
          .from('players')
          .update({
            name: playerName,
            position,
            team_id: teamUuid,
            price,
            total_points: fplPlayer.total_points,
            form: parseFloat(fplPlayer.form),
            selected_by_percent: parseFloat(fplPlayer.selected_by_percent),
            goals: fplPlayer.goals_scored,
            assists: fplPlayer.assists,
            clean_sheets: fplPlayer.clean_sheets,
            yellow_cards: fplPlayer.yellow_cards,
            red_cards: fplPlayer.red_cards,
            saves: fplPlayer.saves,
            bonus_points: fplPlayer.bonus,
            photo_url: photoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPlayer.id);

        if (updateError) {
          console.error(`Error updating player ${playerName}:`, updateError);
        } else {
          updatedCount++;
        }
      } else {
        // Only add players from major teams to avoid too many players
        const majorTeams = [1, 6, 12, 13, 14, 18]; // Arsenal, Chelsea, Liverpool, Man City, Man United, Tottenham
        
        if (majorTeams.includes(fplPlayer.team)) {
          // Insert new player
          const { error: insertError } = await supabase
            .from('players')
            .insert({
              name: playerName,
              position,
              team_id: teamUuid,
              price,
              total_points: fplPlayer.total_points,
              form: parseFloat(fplPlayer.form),
              selected_by_percent: parseFloat(fplPlayer.selected_by_percent),
              goals: fplPlayer.goals_scored,
              assists: fplPlayer.assists,
              clean_sheets: fplPlayer.clean_sheets,
              yellow_cards: fplPlayer.yellow_cards,
              red_cards: fplPlayer.red_cards,
              saves: fplPlayer.saves,
              bonus_points: fplPlayer.bonus,
              photo_url: photoUrl,
              is_available: true
            });

          if (insertError) {
            console.error(`Error inserting player ${playerName}:`, insertError);
          } else {
            newPlayersCount++;
          }
        }
      }
    }

    // Update current gameweek
    const currentGameweek = await fplApi.getCurrentGameweek();
    
    return NextResponse.json({
      success: true,
      data: {
        playersUpdated: updatedCount,
        newPlayers: newPlayersCount,
        totalFplPlayers: fplPlayers.length,
        currentGameweek
      },
      message: `Sync completed: ${updatedCount} updated, ${newPlayersCount} new players`
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