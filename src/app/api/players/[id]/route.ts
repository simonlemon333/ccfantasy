import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/players/[id] - Get specific player details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: player, error } = await supabase
      .from('players')
      .select(`
        *,
        teams(id, name, short_name, logo_url, primary_color, secondary_color)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Player not found'
        }, { status: 404 });
      }
      throw error;
    }

    // Get player events for recent games
    const { data: recentEvents, error: eventsError } = await supabase
      .from('player_events')
      .select(`
        *,
        fixtures(
          id, gameweek, kickoff_time, home_score, away_score,
          home_team:teams!fixtures_home_team_id_fkey(short_name, name),
          away_team:teams!fixtures_away_team_id_fkey(short_name, name)
        )
      `)
      .eq('player_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (eventsError) {
      console.warn('Error fetching player events:', eventsError);
    }

    // Get selection percentage in lineups
    const { count: totalLineups } = await supabase
      .from('lineup_players')
      .select('*', { count: 'exact', head: true });

    const { count: playerSelections } = await supabase
      .from('lineup_players')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', id);

    const selectionPercentage = totalLineups && totalLineups > 0 
      ? ((playerSelections || 0) / totalLineups * 100).toFixed(1)
      : '0.0';

    return NextResponse.json({
      success: true,
      data: {
        ...player,
        recentEvents: recentEvents || [],
        selectionPercentage: parseFloat(selectionPercentage)
      }
    });

  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch player'
    }, { status: 500 });
  }
}

// PUT /api/players/[id] - Update player (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      position,
      teamId,
      price,
      totalPoints,
      goals,
      assists,
      cleanSheets,
      yellowCards,
      redCards,
      saves,
      bonusPoints,
      isAvailable,
      isAdmin = false
    } = body;

    // Check admin permission
    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin permission required'
      }, { status: 403 });
    }

    // Check if player exists
    const { data: existingPlayer, error: fetchError } = await supabase
      .from('players')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingPlayer) {
      return NextResponse.json({
        success: false,
        error: 'Player not found'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (position !== undefined) {
      const validPositions = ['GK', 'DEF', 'MID', 'FWD'];
      if (!validPositions.includes(position.toUpperCase())) {
        return NextResponse.json({
          success: false,
          error: 'Invalid position'
        }, { status: 400 });
      }
      updateData.position = position.toUpperCase();
    }
    if (teamId !== undefined) updateData.team_id = teamId;
    if (price !== undefined) {
      const priceFloat = parseFloat(price);
      if (priceFloat < 4.0 || priceFloat > 15.0) {
        return NextResponse.json({
          success: false,
          error: 'Price must be between 4.0 and 15.0'
        }, { status: 400 });
      }
      updateData.price = priceFloat;
    }
    if (totalPoints !== undefined) updateData.total_points = parseInt(totalPoints);
    if (goals !== undefined) updateData.goals = parseInt(goals);
    if (assists !== undefined) updateData.assists = parseInt(assists);
    if (cleanSheets !== undefined) updateData.clean_sheets = parseInt(cleanSheets);
    if (yellowCards !== undefined) updateData.yellow_cards = parseInt(yellowCards);
    if (redCards !== undefined) updateData.red_cards = parseInt(redCards);
    if (saves !== undefined) updateData.saves = parseInt(saves);
    if (bonusPoints !== undefined) updateData.bonus_points = parseInt(bonusPoints);
    if (isAvailable !== undefined) updateData.is_available = Boolean(isAvailable);

    // Update player
    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        teams(id, name, short_name, logo_url)
      `)
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      data: updatedPlayer,
      message: 'Player updated successfully'
    });

  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update player'
    }, { status: 500 });
  }
}

// DELETE /api/players/[id] - Delete player (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';

    // Check admin permission
    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin permission required'
      }, { status: 403 });
    }

    // Check if player exists
    const { data: existingPlayer, error: fetchError } = await supabase
      .from('players')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError || !existingPlayer) {
      return NextResponse.json({
        success: false,
        error: 'Player not found'
      }, { status: 404 });
    }

    // Check if player is used in any lineups
    const { count: lineupCount } = await supabase
      .from('lineup_players')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', id);

    if (lineupCount && lineupCount > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete player who is selected in lineups'
      }, { status: 400 });
    }

    // Delete player
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: `Player "${existingPlayer.name}" deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting player:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete player'
    }, { status: 500 });
  }
}