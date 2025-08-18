import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/debug/database-status - 检查数据库各表状态
export async function GET(request: NextRequest) {
  try {
    console.log('检查数据库状态...');

    // 检查各个表的数据量
    const tables = ['teams', 'players', 'fixtures', 'player_events', 'rooms', 'lineups'];
    const tableStatus = {};

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          tableStatus[table] = { error: error.message };
        } else {
          tableStatus[table] = { count };
          
          // 获取样本数据
          const { data: sample } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          tableStatus[table].sample = sample?.[0] ? Object.keys(sample[0]) : [];
        }
      } catch (err) {
        tableStatus[table] = { error: err.message };
      }
    }

    // 检查rooms表的详细情况
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .limit(5);

    // 检查player_events表
    const { data: events, error: eventsError } = await supabase
      .from('player_events')
      .select('*')
      .limit(5);

    // 检查fixtures是否有比赛事件关联
    const { data: fixturesWithEvents, error: fixturesError } = await supabase
      .from('fixtures')
      .select(`
        id,
        gameweek,
        finished,
        home_team:teams!fixtures_home_team_id_fkey(short_name),
        away_team:teams!fixtures_away_team_id_fkey(short_name)
      `)
      .eq('finished', true)
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        tableStatus,
        roomsData: {
          count: rooms?.length || 0,
          sample: rooms,
          error: roomsError?.message
        },
        eventsData: {
          count: events?.length || 0,
          sample: events,
          error: eventsError?.message
        },
        finishedFixtures: {
          count: fixturesWithEvents?.length || 0,
          sample: fixturesWithEvents,
          error: fixturesError?.message
        }
      }
    });

  } catch (error) {
    console.error('Database status check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database check failed'
    }, { status: 500 });
  }
}