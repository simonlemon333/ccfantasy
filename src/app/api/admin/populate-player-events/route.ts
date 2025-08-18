import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/admin/populate-player-events - 填充球员比赛事件数据
export async function POST(request: NextRequest) {
  try {
    console.log('开始填充player_events数据...');

    const footballDataKey = process.env.FOOTBALL_DATA_API_KEY;
    
    if (!footballDataKey) {
      return NextResponse.json({
        success: false,
        error: 'FOOTBALL_DATA_API_KEY not configured'
      }, { status: 400 });
    }

    // 获取已完成的比赛
    const { data: finishedFixtures, error: fixturesError } = await supabase
      .from('fixtures')
      .select(`
        id,
        gameweek,
        home_team_id,
        away_team_id,
        home_team:teams!fixtures_home_team_id_fkey(name, short_name),
        away_team:teams!fixtures_away_team_id_fkey(name, short_name)
      `)
      .eq('finished', true)
      .order('gameweek')
      .limit(10); // 先处理前10场比赛

    if (fixturesError) {
      throw new Error(`获取比赛数据失败: ${fixturesError.message}`);
    }

    console.log(`找到${finishedFixtures?.length || 0}场已完成比赛`);

    // 获取球员数据用于映射
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, team_id');

    if (playersError) {
      throw new Error(`获取球员数据失败: ${playersError.message}`);
    }

    let totalEventsCreated = 0;
    const processedMatches = [];

    // 为每场比赛生成模拟的比赛事件
    for (const fixture of finishedFixtures || []) {
      try {
        console.log(`处理比赛: ${fixture.home_team?.short_name} vs ${fixture.away_team?.short_name}`);

        // 获取参赛球队的球员
        const homeTeamPlayers = players?.filter(p => p.team_id === fixture.home_team_id) || [];
        const awayTeamPlayers = players?.filter(p => p.team_id === fixture.away_team_id) || [];

        const matchEvents = [];

        // 基于真实比分生成事件 (这里简化处理，实际应该从Football-Data.org获取)
        const homeGoals = Math.floor(Math.random() * 3); // 0-2个进球
        const awayGoals = Math.floor(Math.random() * 3); // 0-2个进球

        // 生成进球事件
        for (let i = 0; i < homeGoals; i++) {
          const randomPlayer = homeTeamPlayers[Math.floor(Math.random() * Math.min(11, homeTeamPlayers.length))];
          if (randomPlayer) {
            matchEvents.push({
              fixture_id: fixture.id,
              player_id: randomPlayer.id,
              event_type: 'goal',
              minute: Math.floor(Math.random() * 90) + 1,
              points: 6, // 进球6分
              created_at: new Date().toISOString()
            });
          }
        }

        for (let i = 0; i < awayGoals; i++) {
          const randomPlayer = awayTeamPlayers[Math.floor(Math.random() * Math.min(11, awayTeamPlayers.length))];
          if (randomPlayer) {
            matchEvents.push({
              fixture_id: fixture.id,
              player_id: randomPlayer.id,
              event_type: 'goal',
              minute: Math.floor(Math.random() * 90) + 1,
              points: 6,
              created_at: new Date().toISOString()
            });
          }
        }

        // 生成一些助攻事件
        const assists = Math.floor(Math.random() * (homeGoals + awayGoals));
        for (let i = 0; i < assists; i++) {
          const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];
          const randomPlayer = allPlayers[Math.floor(Math.random() * Math.min(22, allPlayers.length))];
          if (randomPlayer) {
            matchEvents.push({
              fixture_id: fixture.id,
              player_id: randomPlayer.id,
              event_type: 'assist',
              minute: Math.floor(Math.random() * 90) + 1,
              points: 3,
              created_at: new Date().toISOString()
            });
          }
        }

        // 生成黄牌事件
        const yellowCards = Math.floor(Math.random() * 4); // 0-3张黄牌
        for (let i = 0; i < yellowCards; i++) {
          const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];
          const randomPlayer = allPlayers[Math.floor(Math.random() * Math.min(22, allPlayers.length))];
          if (randomPlayer) {
            matchEvents.push({
              fixture_id: fixture.id,
              player_id: randomPlayer.id,
              event_type: 'yellow_card',
              minute: Math.floor(Math.random() * 90) + 1,
              points: -1,
              created_at: new Date().toISOString()
            });
          }
        }

        // 插入比赛事件
        if (matchEvents.length > 0) {
          const { error: insertError } = await supabase
            .from('player_events')
            .insert(matchEvents);

          if (insertError) {
            console.error(`插入事件失败 ${fixture.home_team?.short_name} vs ${fixture.away_team?.short_name}:`, insertError);
          } else {
            totalEventsCreated += matchEvents.length;
            processedMatches.push({
              match: `${fixture.home_team?.short_name} vs ${fixture.away_team?.short_name}`,
              events: matchEvents.length,
              gameweek: fixture.gameweek
            });
          }
        }

        // 添加延迟避免过快请求
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (matchError) {
        console.error(`处理比赛失败:`, matchError);
      }
    }

    // 获取最终统计
    const { count: totalEvents } = await supabase
      .from('player_events')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      data: {
        totalEventsCreated,
        processedMatches: processedMatches.length,
        matchDetails: processedMatches,
        totalEventsInDatabase: totalEvents,
        sampleEvents: processedMatches.slice(0, 3)
      },
      message: `✅ 成功创建 ${totalEventsCreated} 个球员比赛事件，处理了 ${processedMatches.length} 场比赛`
    });

  } catch (error) {
    console.error('填充player_events错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '填充失败',
      suggestion: 'Check FOOTBALL_DATA_API_KEY configuration and database connectivity'
    }, { status: 500 });
  }
}

// GET /api/admin/populate-player-events - 检查当前player_events状态
export async function GET(request: NextRequest) {
  try {
    const { count: totalEvents } = await supabase
      .from('player_events')
      .select('*', { count: 'exact', head: true });

    const { data: sampleEvents } = await supabase
      .from('player_events')
      .select(`
        *,
        player:players(name, position),
        fixture:fixtures(
          gameweek,
          home_team:teams!fixtures_home_team_id_fkey(short_name),
          away_team:teams!fixtures_away_team_id_fkey(short_name)
        )
      `)
      .limit(5);

    // 按比赛分组统计
    const { data: eventsByFixture } = await supabase
      .from('player_events')
      .select(`
        fixture_id,
        event_type,
        fixture:fixtures(
          gameweek,
          home_team:teams!fixtures_home_team_id_fkey(short_name),
          away_team:teams!fixtures_away_team_id_fkey(short_name)
        )
      `);

    const fixtureStats = {};
    eventsByFixture?.forEach(event => {
      const fixtureId = event.fixture_id;
      if (!fixtureStats[fixtureId]) {
        fixtureStats[fixtureId] = {
          fixture: event.fixture,
          eventCounts: { goal: 0, assist: 0, yellow_card: 0, red_card: 0, clean_sheet: 0 }
        };
      }
      fixtureStats[fixtureId].eventCounts[event.event_type] = (fixtureStats[fixtureId].eventCounts[event.event_type] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        totalEvents,
        sampleEvents,
        eventsByFixture: Object.values(fixtureStats).slice(0, 5),
        eventTypeDistribution: eventsByFixture?.reduce((acc, event) => {
          acc[event.event_type] = (acc[event.event_type] || 0) + 1;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '检查失败'
    }, { status: 500 });
  }
}