import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/rooms/[id]/leaderboard - 获取房间排行榜和参与队伍
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    
    console.log(`获取房间 ${roomId} 的排行榜信息...`);

    // 获取房间基本信息
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({
        success: false,
        error: '房间不存在'
      }, { status: 404 });
    }

    // 获取房间成员和他们的阵容
    const { data: roomMembers, error: membersError } = await supabase
      .from('room_members')
      .select(`
        user_id,
        joined_at,
        is_active
      `)
      .eq('room_id', roomId)
      .eq('is_active', true);

    if (membersError) {
      console.error('获取房间成员错误:', membersError);
    }

    console.log(`房间 ${roomId} 有 ${roomMembers?.length || 0} 个成员`);

    // 获取每个成员的阵容和积分
    const memberLineups = [];
    
    if (roomMembers && roomMembers.length > 0) {
      for (const member of roomMembers) {
        try {
          // 获取用户基本信息 (模拟用户系统)
          const mockUser = {
            id: member.user_id,
            username: `用户${member.user_id.substring(0, 8)}`,
            email: `user${member.user_id.substring(0, 8)}@fantasy.com`
          };

          // 获取用户在这个房间的阵容
          const { data: lineups, error: lineupError } = await supabase
            .from('lineups')
            .select(`
              *,
              lineup_players(
                player_id,
                is_starter,
                is_captain,
                is_vice_captain,
                players(
                  name,
                  position,
                  total_points,
                  teams(name, short_name)
                )
              )
            `)
            .eq('user_id', member.user_id)
            .eq('room_id', roomId)
            .eq('gameweek', room.gameweek || 1)
            .order('created_at', { ascending: false })
            .limit(1);

          if (lineupError) {
            console.error(`获取用户 ${member.user_id} 阵容错误:`, lineupError);
          }

          const currentLineup = lineups?.[0];
          
          // 计算总积分
          let totalPoints = 0;
          if (currentLineup?.lineup_players) {
            totalPoints = currentLineup.lineup_players.reduce((sum, lp) => {
              const playerPoints = lp.players?.total_points || 0;
              const multiplier = lp.is_captain ? 2 : 1; // 队长2倍积分
              return sum + (playerPoints * multiplier);
            }, 0);
          }

          memberLineups.push({
            user: mockUser,
            lineup: currentLineup,
            totalPoints,
            playerCount: currentLineup?.lineup_players?.length || 0,
            starterCount: currentLineup?.lineup_players?.filter(lp => lp.is_starter).length || 0,
            captain: currentLineup?.lineup_players?.find(lp => lp.is_captain)?.players?.name || null,
            joinedAt: member.joined_at
          });

        } catch (memberError) {
          console.error(`处理成员 ${member.user_id} 数据错误:`, memberError);
          
          // 即使处理失败也要显示基本用户信息
          memberLineups.push({
            user: {
              id: member.user_id,
              username: `用户${member.user_id.substring(0, 8)}`,
              email: `user${member.user_id.substring(0, 8)}@fantasy.com`
            },
            lineup: null,
            totalPoints: 0,
            playerCount: 0,
            starterCount: 0,
            captain: null,
            joinedAt: member.joined_at,
            error: '无法加载阵容数据'
          });
        }
      }
    }

    // 按积分排序
    memberLineups.sort((a, b) => b.totalPoints - a.totalPoints);

    // 添加排名
    memberLineups.forEach((member, index) => {
      member.rank = index + 1;
    });

    // 统计信息
    const stats = {
      totalMembers: memberLineups.length,
      membersWithLineups: memberLineups.filter(m => m.lineup).length,
      averagePoints: memberLineups.length > 0 
        ? Math.round(memberLineups.reduce((sum, m) => sum + m.totalPoints, 0) / memberLineups.length)
        : 0,
      highestPoints: memberLineups.length > 0 ? memberLineups[0].totalPoints : 0,
      currentGameweek: room.gameweek || 1
    };

    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
          roomCode: room.room_code,
          maxPlayers: room.max_players,
          currentPlayers: room.current_players,
          gameweek: room.gameweek || 1,
          budgetLimit: room.budget_limit,
          isActive: room.is_active
        },
        leaderboard: memberLineups,
        stats
      },
      message: `获取房间 ${room.name} 排行榜成功`
    });

  } catch (error) {
    console.error('获取房间排行榜错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取排行榜失败'
    }, { status: 500 });
  }
}