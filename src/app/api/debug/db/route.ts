import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/debug/db - Debug database tables and relationships
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const roomId = searchParams.get('roomId');

    console.log('Debug DB request:', { table, roomId });

    let result = {};

    switch (table) {
      case 'users':
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, username, display_name, created_at')
          .limit(10);
        result = { users, error: usersError };
        break;

      case 'lineups':
        if (roomId) {
          // Check specific room lineups
          const { data: roomLineups, error: roomLineupsError } = await supabase
            .from('lineups')
            .select('id, user_id, room_id, gameweek, is_submitted, total_points, created_at')
            .eq('room_id', roomId);
          result = { roomLineups, error: roomLineupsError };
        } else {
          // Check all lineups
          const { data: allLineups, error: allLineupsError } = await supabase
            .from('lineups')
            .select('id, user_id, room_id, gameweek, is_submitted, total_points, created_at')
            .limit(20)
            .order('created_at', { ascending: false });
          result = { allLineups, error: allLineupsError };
        }
        break;

      case 'room_members':
        const { data: roomMembers, error: roomMembersError } = await supabase
          .from('room_members')
          .select('id, room_id, user_id, is_active, joined_at')
          .limit(20);
        result = { roomMembers, error: roomMembersError };
        break;

      case 'rooms':
        const { data: rooms, error: roomsError } = await supabase
          .from('rooms')
          .select('id, name, room_code, gameweek, is_active, created_by, current_players, max_players')
          .limit(10);
        result = { rooms, error: roomsError };
        break;

      case 'teams':
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, short_name, logo_url, primary_color, secondary_color')
          .order('name')
          .limit(30);
        result = { teams, error: teamsError };
        break;

      case 'fixtures':
        // Join with teams to get readable team names
        const { data: fixtures, error: fixturesError } = await supabase
          .from('fixtures')
          .select(`
            id,
            gameweek,
            home_score,
            away_score,
            finished,
            minutes_played,
            kickoff_time,
            updated_at,
            home_team:teams!fixtures_home_team_id_fkey(name, short_name),
            away_team:teams!fixtures_away_team_id_fkey(name, short_name)
          `)
          .order('kickoff_time', { ascending: false })
          .limit(20);
        result = { fixtures, error: fixturesError };
        break;

      default:
        // General database health check
        const checks = await Promise.all([
          supabase.from('users').select('count', { count: 'exact', head: true }),
          supabase.from('rooms').select('count', { count: 'exact', head: true }),
          supabase.from('room_members').select('count', { count: 'exact', head: true }),
          supabase.from('lineups').select('count', { count: 'exact', head: true }),
          supabase.from('lineup_players').select('count', { count: 'exact', head: true }),
          supabase.from('players').select('count', { count: 'exact', head: true }),
          supabase.from('teams').select('count', { count: 'exact', head: true }),
          supabase.from('fixtures').select('count', { count: 'exact', head: true }),
        ]);

        result = {
          tableCounts: {
            users: checks[0].count,
            rooms: checks[1].count,
            room_members: checks[2].count,
            lineups: checks[3].count,
            lineup_players: checks[4].count,
            players: checks[5].count,
            teams: checks[6].count,
            fixtures: checks[7].count,
          },
          errors: checks.map(c => c.error).filter(e => e)
        };
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Database debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database debug failed'
    }, { status: 500 });
  }
}