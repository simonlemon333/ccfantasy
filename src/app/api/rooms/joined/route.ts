import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/rooms/joined - 获取用户已加入的房间
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '缺少userId参数'
      }, { status: 400 });
    }

    console.log(`获取用户 ${userId} 已加入的房间...`);

    // 获取用户加入的房间
    const { data: roomMemberships, error: membershipError } = await supabase
      .from('room_members')
      .select(`
        room_id,
        joined_at,
        is_active,
        rooms(
          id,
          room_code,
          name,
          description,
          max_players,
          current_players,
          season,
          gameweek,
          is_active,
          is_public,
          budget_limit,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false });

    if (membershipError) {
      throw new Error(`获取房间成员关系失败: ${membershipError.message}`);
    }

    console.log(`用户 ${userId} 加入了 ${roomMemberships?.length || 0} 个房间`);

    // 为每个房间获取详细统计信息
    const roomsWithStats = [];

    if (roomMemberships && roomMemberships.length > 0) {
      for (const membership of roomMemberships) {
        const room = membership.rooms;
        if (!room) continue;

        try {
          // 获取房间成员总数
          const { count: memberCount } = await supabase
            .from('room_members')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .eq('is_active', true);

          // 获取用户在这个房间的最新阵容
          const { data: userLineup, error: lineupError } = await supabase
            .from('lineups')
            .select(`
              id,
              total_points,
              gameweek,
              lineup_players(count)
            `)
            .eq('user_id', userId)
            .eq('room_id', room.id)
            .eq('gameweek', room.gameweek || 1)
            .order('created_at', { ascending: false })
            .limit(1);

          if (lineupError) {
            console.error(`获取用户阵容失败:`, lineupError);
          }

          // 获取房间排行榜中用户的排名
          const { data: allLineups } = await supabase
            .from('lineups')
            .select('user_id, total_points')
            .eq('room_id', room.id)
            .eq('gameweek', room.gameweek || 1)
            .order('total_points', { ascending: false });

          const userRank = allLineups?.findIndex(l => l.user_id === userId) + 1 || null;

          roomsWithStats.push({
            room: {
              id: room.id,
              roomCode: room.room_code,
              name: room.name,
              description: room.description,
              maxPlayers: room.max_players,
              currentPlayers: memberCount || 0,
              season: room.season,
              gameweek: room.gameweek || 1,
              isActive: room.is_active,
              isPublic: room.is_public,
              budgetLimit: room.budget_limit,
              createdAt: room.created_at
            },
            userStats: {
              joinedAt: membership.joined_at,
              hasLineup: !!(userLineup && userLineup.length > 0),
              totalPoints: userLineup?.[0]?.total_points || 0,
              playerCount: userLineup?.[0]?.lineup_players?.[0]?.count || 0,
              currentRank: userRank
            },
            roomStats: {
              totalMembers: memberCount || 0,
              totalLineupsSubmitted: allLineups?.length || 0
            }
          });

        } catch (roomError) {
          console.error(`处理房间 ${room.id} 统计失败:`, roomError);
          
          // 即使处理失败也要显示基本房间信息
          roomsWithStats.push({
            room: {
              id: room.id,
              roomCode: room.room_code,
              name: room.name,
              description: room.description,
              maxPlayers: room.max_players,
              currentPlayers: room.current_players,
              season: room.season,
              gameweek: room.gameweek || 1,
              isActive: room.is_active,
              isPublic: room.is_public,
              budgetLimit: room.budget_limit,
              createdAt: room.created_at
            },
            userStats: {
              joinedAt: membership.joined_at,
              hasLineup: false,
              totalPoints: 0,
              playerCount: 0,
              currentRank: null
            },
            roomStats: {
              totalMembers: 0,
              totalLineupsSubmitted: 0
            },
            error: '无法加载房间统计'
          });
        }
      }
    }

    // 统计概览
    const summary = {
      totalRoomsJoined: roomsWithStats.length,
      activeRooms: roomsWithStats.filter(r => r.room.isActive).length,
      publicRooms: roomsWithStats.filter(r => r.room.isPublic).length,
      roomsWithLineups: roomsWithStats.filter(r => r.userStats.hasLineup).length,
      totalPoints: roomsWithStats.reduce((sum, r) => sum + r.userStats.totalPoints, 0),
      averageRank: roomsWithStats
        .filter(r => r.userStats.currentRank)
        .reduce((sum, r, _, arr) => sum + r.userStats.currentRank / arr.length, 0) || null
    };

    return NextResponse.json({
      success: true,
      data: {
        rooms: roomsWithStats,
        summary
      },
      message: `获取用户已加入的 ${roomsWithStats.length} 个房间成功`
    });

  } catch (error) {
    console.error('获取用户房间失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取用户房间失败'
    }, { status: 500 });
  }
}