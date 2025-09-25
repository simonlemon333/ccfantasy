import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSupabaseUser } from '@/lib/getSupabaseUser';
import { validateLineup, calculateLineupCost, DEFAULT_CONSTRAINTS } from '@/lib/validateLineup';

interface PlayerSelection {
  id: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  team_id: string;
  price: number;
  is_starter: boolean;
  is_captain: boolean;
  is_vice_captain: boolean;
}

// GET /api/lineups - Get lineups for user/room
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const roomId = searchParams.get('roomId');
    const gameweek = searchParams.get('gameweek');
    const lineupId = searchParams.get('lineupId');

    console.log('GET /api/lineups params:', { userId, roomId, gameweek, lineupId });

    // Use user client for RLS consistency if Authorization header is present
    let queryClient = supabase;
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const supabaseUserResult = await getSupabaseUser(request);
      if (!(supabaseUserResult as any).error) {
        queryClient = (supabaseUserResult as any).supabaseUser;
        console.log('Using user client for GET query');
      }
    }

    // Build query with filters
    let query = queryClient
      .from('lineups')
      .select(`
        *,
        users(id, username, display_name),
        rooms(id, name, room_code)
      `);

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (roomId) {
      query = query.eq('room_id', roomId);
    }
    if (gameweek) {
      query = query.eq('gameweek', parseInt(gameweek));
    }
    if (lineupId) {
      query = query.eq('id', lineupId);
    }

    // Order by latest first
    query = query.order('created_at', { ascending: false });

    const { data: lineupsData, error } = await query;
    console.log('Query result:', { lineups: lineupsData?.length || 0, error });

    if (error) throw error;

    // If we have lineups, fetch their players separately to avoid foreign key issues
    if (lineupsData && lineupsData.length > 0) {
      const lineupIds = lineupsData.map(lineup => lineup.id);

      // Fetch lineup players
      const { data: lineupPlayers, error: lpError } = await queryClient
        .from('lineup_players')
        .select('*')
        .in('lineup_id', lineupIds);

      if (lpError) {
        console.error('Error fetching lineup players:', lpError);
        throw lpError;
      }

      // Fetch player details if we have lineup players
      if (lineupPlayers && lineupPlayers.length > 0) {
        const playerIds = [...new Set(lineupPlayers.map(lp => lp.player_id))];

        const { data: players, error: playersError } = await queryClient
          .from('players')
          .select('id, name, position, team, price, total_points, photo_url')
          .in('id', playerIds);

        if (playersError) {
          console.error('Error fetching players:', playersError);
          throw playersError;
        }

        // Create player lookup map
        const playerMap = new Map();
        if (players) {
          players.forEach(player => {
            playerMap.set(player.id, player);
          });
        }

        // Attach player data to lineup players
        lineupPlayers.forEach(lp => {
          lp.players = playerMap.get(lp.player_id);
        });
      }

      // Group lineup players by lineup_id
      const lineupPlayersMap = new Map();
      if (lineupPlayers) {
        lineupPlayers.forEach(lp => {
          if (!lineupPlayersMap.has(lp.lineup_id)) {
            lineupPlayersMap.set(lp.lineup_id, []);
          }
          lineupPlayersMap.get(lp.lineup_id).push(lp);
        });
      }

      // Attach lineup players to lineups
      lineupsData.forEach(lineup => {
        lineup.lineup_players = lineupPlayersMap.get(lineup.id) || [];
      });
    }

    return NextResponse.json({
      success: true,
      data: lineupsData
    });

  } catch (error) {
    console.error('Error fetching lineups:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch lineups'
    }, { status: 500 });
  }
}

// POST /api/lineups - Create/update lineup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      roomId,
      gameweek,
      players, // Array of PlayerSelection
      formation = '4-4-2',
      captainId,
      viceCaptainId,
      isSubmitted = false
    } = body;

    // Validation
    if (!userId || !gameweek || !players || !Array.isArray(players)) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userId, gameweek, players'
      }, { status: 400 });
    }

    // If this is a submitted lineup it must belong to a room and user must be a member.
    // If it's a draft (isSubmitted === false), allow saving without room membership or even roomId.
    const isSubmittedFlag = !!isSubmitted;

  // Create a per-request supabase client using the user's access token so RLS will apply the user's identity
  const supabaseUserResult = await getSupabaseUser(request);
  // Narrow union: if helper returned an error response, return it directly
  if ((supabaseUserResult as any).error) {
    return (supabaseUserResult as any).error;
  }
  // At this point TypeScript still can't infer the exact supabase client type from the helper,
  // so cast to any for server-side DB operations to avoid noisy type errors.
  const { supabaseUser } = supabaseUserResult as { supabaseUser: any };

    if (isSubmittedFlag) {
      if (!roomId) {
        return NextResponse.json({ success: false, error: 'roomId required when submitting lineup' }, { status: 400 });
      }

      const { data: membership, error: membershipError } = await supabaseUser
        .from('room_members')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (membershipError || !membership) {
        return NextResponse.json({
          success: false,
          error: 'User is not a member of this room'
        }, { status: 403 });
      }
    }

    // Get player details from database for validation
    const playerIds = players.map((p: PlayerSelection) => p.id);
    const { data: dbPlayers, error: playersError } = await supabase
      .from('players')
      .select('id, position, team, price, is_available')
      .in('id', playerIds);

    if (playersError) throw playersError;

    if (dbPlayers.length !== playerIds.length) {
      return NextResponse.json({
        success: false,
        error: 'Some selected players do not exist'
      }, { status: 400 });
    }

    // Check if all players are available
    const unavailablePlayers = dbPlayers.filter(p => !p.is_available);
    if (unavailablePlayers.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Some players are no longer available: ${unavailablePlayers.map(p => p.id).join(', ')}`
      }, { status: 400 });
    }

    // Merge client data with database data for validation
    const validationPlayers: PlayerSelection[] = players.map((clientPlayer: PlayerSelection) => {
      const dbPlayer = dbPlayers.find(p => p.id === clientPlayer.id);
      return {
        id: clientPlayer.id,
        position: dbPlayer!.position,
        team_id: dbPlayer!.team,
        price: dbPlayer!.price,
        is_starter: clientPlayer.is_starter,
        is_captain: clientPlayer.is_captain,
        is_vice_captain: clientPlayer.is_vice_captain
      };
    });

  // Validate lineup (allow drafts to be less strict? use same validator but it's sized for 11)
    const validation = validateLineup(validationPlayers);
    if (!validation.isValid) {
      // Map team IDs in validation errors to team names where possible
      try {
        // compute team counts to find offending teams
        const teamCounts = validationPlayers.reduce((acc: Record<string, number>, p) => {
          const t = p.team_id || 'unknown';
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const offendingTeamIds = Object.entries(teamCounts)
          .filter(([, cnt]) => cnt > (DEFAULT_CONSTRAINTS.maxPlayersPerTeam || 3))
          .map(([id]) => id);

        let idToName: Record<string, string> = {};
        if (offendingTeamIds.length > 0) {
          const { data: teamsData } = await supabase
            .from('teams')
            .select('id, name')
            .in('id', offendingTeamIds as string[]);
          if (teamsData && Array.isArray(teamsData)) {
            idToName = teamsData.reduce((m: Record<string, string>, t: any) => { m[t.id] = t.name; return m; }, {} as Record<string,string>);
          }
        }

        const mappedErrors = validation.errors.map(err => {
          let replaced = err;
          offendingTeamIds.forEach(tid => {
            const name = idToName[tid];
            if (name) replaced = replaced.split(tid).join(name);
          });
          return replaced;
        });

        const combinedError = mappedErrors.length > 0 ? `Lineup validation failed: ${mappedErrors[0]}` : 'Lineup validation failed';

        return NextResponse.json({
          success: false,
          error: combinedError,
          details: mappedErrors
        }, { status: 400 });
      } catch (mapErr) {
        // Fallback: return original validation errors
        return NextResponse.json({
          success: false,
          error: 'Lineup validation failed',
          details: validation.errors
        }, { status: 400 });
      }
    }

    // Calculate total cost
    const totalCost = calculateLineupCost(validationPlayers);

    // If saving as draft (room_id is null), delete any existing drafts for this user first
    if (!roomId) {
      console.log('Saving as draft - removing existing drafts for user:', userId);
      const { error: deleteDraftsError } = await supabaseUser
        .from('lineups')
        .delete()
        .eq('user_id', userId)
        .is('room_id', null);
      
      if (deleteDraftsError) {
        console.error('Error deleting existing drafts:', deleteDraftsError);
        // Don't throw here, continue with save
      }
    }

    // Check if lineup already exists for this user/room/gameweek
  const { data: existingLineup, error: existingError } = await supabase
      .from('lineups')
      .select('id')
      .eq('user_id', userId)
      .eq('room_id', roomId)
      .eq('gameweek', gameweek)
      .maybeSingle();

    let lineupId: string;

    if (existingLineup) {
      // Update existing lineup
      const { data: updatedLineup, error: updateError } = await supabaseUser
        .from('lineups')
        .update({
          formation,
          captain_id: captainId,
          vice_captain_id: viceCaptainId,
          total_cost: totalCost,
          is_submitted: isSubmitted,
          submitted_at: isSubmitted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLineup.id)
        .select()
        .maybeSingle();

      if (updateError) throw updateError;
      if (!updatedLineup) throw new Error('Update returned no rows — possible RLS/permission issue');
      lineupId = updatedLineup.id;

      // Delete existing lineup players
      const { error: deleteError } = await supabaseUser
        .from('lineup_players')
        .delete()
        .eq('lineup_id', lineupId);

      if (deleteError) throw deleteError;

    } else {
      // Create new lineup
      const { data: newLineup, error: createError } = await supabaseUser
        .from('lineups')
        .insert({
          user_id: userId,
          room_id: roomId,
          gameweek,
          formation,
          captain_id: captainId,
          vice_captain_id: viceCaptainId,
          total_cost: totalCost,
          is_submitted: isSubmitted,
          submitted_at: isSubmitted ? new Date().toISOString() : null
        })
        .select()
        .maybeSingle();

      if (createError) throw createError;
      if (!newLineup) throw new Error('Insert returned no rows — possible RLS/permission issue');
      lineupId = newLineup.id;
    }

    // Insert lineup players
    const lineupPlayersData = validationPlayers.map(player => ({
      lineup_id: lineupId,
      player_id: player.id,
      position: player.position,
      is_starter: player.is_starter,
      is_captain: player.is_captain,
      is_vice_captain: player.is_vice_captain,
      multiplier: player.is_captain ? 2 : 1
    }));

    const { error: insertError } = await supabaseUser
      .from('lineup_players')
      .insert(lineupPlayersData);

    if (insertError) throw insertError;

    // Fetch complete lineup data using the same user client to ensure RLS consistency
  const { data: completeLineup, error: fetchError } = await supabaseUser
      .from('lineups')
      .select(`
        *,
        users(id, username, display_name),
        rooms(id, name, room_code)
      `)
      .eq('id', lineupId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!completeLineup) throw new Error('Failed to fetch lineup after save — row not found (possible RLS)');

    // Fetch lineup players separately
    const { data: lineupPlayers, error: lpError } = await supabaseUser
      .from('lineup_players')
      .select('*')
      .eq('lineup_id', lineupId);

    if (lpError) throw lpError;

    // Fetch player details if we have lineup players
    if (lineupPlayers && lineupPlayers.length > 0) {
      const playerIds = [...new Set(lineupPlayers.map(lp => lp.player_id))];

      const { data: players, error: playersError } = await supabaseUser
        .from('players')
        .select('id, name, position, team, price, total_points, photo_url')
        .in('id', playerIds);

      if (playersError) throw playersError;

      // Create player lookup map
      const playerMap = new Map();
      if (players) {
        players.forEach(player => {
          playerMap.set(player.id, player);
        });
      }

      // Attach player data to lineup players
      lineupPlayers.forEach(lp => {
        lp.players = playerMap.get(lp.player_id);
      });
    }

    // Attach lineup players to the complete lineup
    completeLineup.lineup_players = lineupPlayers || [];

    return NextResponse.json({
      success: true,
      data: completeLineup,
      validation: {
        warnings: validation.warnings
      },
      message: existingLineup ? 'Lineup updated successfully' : 'Lineup created successfully'
    });

  } catch (error) {
    console.error('Error creating/updating lineup:', error);
    // Try to extract useful information from the error object (supabase errors often include message/details)
    const errAny = error as any;
    const errMsg = errAny?.message || errAny?.msg || String(errAny);
    const errDetailCandidates = [] as string[];
    if (errAny?.details) errDetailCandidates.push(String(errAny.details));
    if (errAny?.hint) errDetailCandidates.push(String(errAny.hint));
    if (errAny?.message) errDetailCandidates.push(String(errAny.message));

    const responseBody: any = {
      success: false,
      error: `Failed to create/update lineup${errMsg ? `: ${errMsg}` : ''}`
    };
    if (errDetailCandidates.length > 0) responseBody.details = errDetailCandidates;
    if (process.env.NODE_ENV !== 'production') responseBody._raw = errAny;

    return NextResponse.json(responseBody, { status: 500 });
  }
}