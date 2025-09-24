import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/fixtures/[id]/events - 获取比赛详细事件
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fixtureId } = await params;
    
    console.log(`获取比赛 ${fixtureId} 的详细事件...`);

    // 获取比赛基本信息
    const { data: fixture, error: fixtureError } = await supabase
      .from('fixtures')
      .select(`
        id,
        gameweek,
        home_team_id,
        away_team_id,
        kickoff_time,
        home_score,
        away_score,
        finished,
        minutes_played,
        home_team:teams!fixtures_home_team_id_fkey(
          id,
          name,
          short_name,
          logo_url,
          primary_color
        ),
        away_team:teams!fixtures_away_team_id_fkey(
          id,
          name,
          short_name,
          logo_url,
          primary_color
        )
      `)
      .eq('id', fixtureId)
      .single();

    if (fixtureError || !fixture) {
      return NextResponse.json({
        success: false,
        error: '比赛不存在'
      }, { status: 404 });
    }

    // 获取比赛事件 (移除不存在的description字段)
    const { data: events, error: eventsError } = await supabase
      .from('player_events')
      .select(`
        id,
        event_type,
        minute,
        points,
        created_at,
        player:players(
          id,
          name,
          position,
          team_id,
          teams(
            name,
            short_name,
            logo_url
          )
        )
      `)
      .eq('fixture_id', fixtureId)
      .order('minute', { ascending: true });

    if (eventsError) {
      console.error('获取比赛事件失败:', eventsError);
      return NextResponse.json({
        success: false,
        error: `获取比赛事件失败: ${eventsError.message}`,
        debug: { fixtureId, eventsError }
      }, { status: 500 });
    }

    console.log(`比赛 ${fixtureId} 有 ${events?.length || 0} 个事件`);

    // 按事件类型分组统计
    const eventStats = {
      goals: events?.filter(e => e.event_type === 'goal').length || 0,
      assists: events?.filter(e => e.event_type === 'assist').length || 0,
      yellowCards: events?.filter(e => e.event_type === 'yellow_card').length || 0,
      redCards: events?.filter(e => e.event_type === 'red_card').length || 0,
      cleanSheets: events?.filter(e => e.event_type === 'clean_sheet').length || 0,
      totalEvents: events?.length || 0
    };

    // 按队伍分组事件
    const homeTeamEvents = events?.filter(e =>
      (e.player as any)?.teams?.short_name === (fixture.home_team as any)?.short_name
    ) || [];

    const awayTeamEvents = events?.filter(e =>
      (e.player as any)?.teams?.short_name === (fixture.away_team as any)?.short_name
    ) || [];

    // 计算队伍统计
    const teamStats = {
      homeTeam: {
        name: (fixture.home_team as any)?.name,
        shortName: (fixture.home_team as any)?.short_name,
        logo: (fixture.home_team as any)?.logo_url,
        score: fixture.home_score,
        events: homeTeamEvents.length,
        goals: homeTeamEvents.filter(e => e.event_type === 'goal').length,
        assists: homeTeamEvents.filter(e => e.event_type === 'assist').length,
        yellowCards: homeTeamEvents.filter(e => e.event_type === 'yellow_card').length,
        redCards: homeTeamEvents.filter(e => e.event_type === 'red_card').length
      },
      awayTeam: {
        name: (fixture.away_team as any)?.name,
        shortName: (fixture.away_team as any)?.short_name,
        logo: (fixture.away_team as any)?.logo_url,
        score: fixture.away_score,
        events: awayTeamEvents.length,
        goals: awayTeamEvents.filter(e => e.event_type === 'goal').length,
        assists: awayTeamEvents.filter(e => e.event_type === 'assist').length,
        yellowCards: awayTeamEvents.filter(e => e.event_type === 'yellow_card').length,
        redCards: awayTeamEvents.filter(e => e.event_type === 'red_card').length
      }
    };

    // 创建时间轴事件
    const timeline = events?.map(event => ({
      id: event.id,
      minute: event.minute,
      eventType: event.event_type,
      description: `${(event.player as any)?.name} ${getEventDescription(event.event_type)}`,
      player: {
        name: (event.player as any)?.name,
        position: (event.player as any)?.position,
        team: (event.player as any)?.teams?.short_name
      },
      points: event.points,
      team: (event.player as any)?.teams?.short_name === (fixture.home_team as any)?.short_name ? 'home' : 'away'
    })) || [];

    // 按分钟分组时间轴
    const timelineByPeriod = {
      firstHalf: timeline.filter(e => e.minute <= 45),
      secondHalf: timeline.filter(e => e.minute > 45 && e.minute <= 90),
      extraTime: timeline.filter(e => e.minute > 90)
    };

    return NextResponse.json({
      success: true,
      data: {
        fixture: {
          id: fixture.id,
          gameweek: fixture.gameweek,
          kickoffTime: fixture.kickoff_time,
          finished: fixture.finished,
          minutesPlayed: fixture.minutes_played,
          homeTeam: fixture.home_team,
          awayTeam: fixture.away_team,
          score: {
            home: fixture.home_score,
            away: fixture.away_score
          }
        },
        events: events || [],
        timeline,
        timelineByPeriod,
        eventStats,
        teamStats,
        matchSummary: {
          totalEvents: events?.length || 0,
          matchStatus: fixture.finished ? 'completed' : 'in_progress',
          duration: fixture.minutes_played || 0,
          isCompetitive: (fixture.home_score || 0) !== (fixture.away_score || 0)
        }
      },
      message: `获取比赛 ${(fixture.home_team as any)?.short_name} vs ${(fixture.away_team as any)?.short_name} 事件成功`
    });

  } catch (error) {
    console.error('获取比赛事件错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取比赛事件失败'
    }, { status: 500 });
  }
}

// 事件描述辅助函数
function getEventDescription(eventType: string): string {
  const descriptions = {
    goal: '进球',
    assist: '助攻',
    yellow_card: '黄牌',
    red_card: '红牌',
    clean_sheet: '零封',
    penalty_save: '扑点',
    penalty_miss: '失点',
    own_goal: '乌龙球'
  };
  
  return descriptions[eventType] || eventType;
}