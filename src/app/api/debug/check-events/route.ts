import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/debug/check-events - 调试player_events数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fixtureId = searchParams.get('fixtureId');

    // 直接查询player_events表
    const { data: allEvents, error: allError } = await supabase
      .from('player_events')
      .select('*')
      .limit(5);

    if (allError) {
      console.error('查询all events失败:', allError);
    }

    // 查询特定fixture的events
    let fixtureEvents = [];
    if (fixtureId) {
      const { data: events, error: eventsError } = await supabase
        .from('player_events')
        .select('*')
        .eq('fixture_id', fixtureId);

      if (eventsError) {
        console.error('查询fixture events失败:', eventsError);
      } else {
        fixtureEvents = events || [];
      }
    }

    // 测试关联查询
    const { data: eventsWithPlayers, error: joinError } = await supabase
      .from('player_events')
      .select(`
        id,
        fixture_id,
        event_type,
        minute,
        player:players(name, position, team_id)
      `)
      .limit(3);

    if (joinError) {
      console.error('关联查询失败:', joinError);
    }

    // 测试完整关联
    const { data: fullJoin, error: fullError } = await supabase
      .from('player_events')
      .select(`
        id,
        fixture_id,
        event_type,
        minute,
        player:players(
          name,
          position,
          team_id,
          teams(name, short_name)
        )
      `)
      .limit(2);

    if (fullError) {
      console.error('完整关联查询失败:', fullError);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalEvents: allEvents?.length || 0,
        sampleEvents: allEvents?.slice(0, 3),
        fixtureEvents: {
          fixtureId,
          count: fixtureEvents.length,
          events: fixtureEvents.slice(0, 3)
        },
        testQueries: {
          eventsWithPlayers: eventsWithPlayers?.length || 0,
          sampleWithPlayers: eventsWithPlayers?.slice(0, 2),
          fullJoin: fullJoin?.length || 0,
          sampleFullJoin: fullJoin
        },
        errors: {
          allError: allError?.message,
          joinError: joinError?.message,
          fullError: fullError?.message
        }
      }
    });

  } catch (error) {
    console.error('调试events错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '调试失败'
    }, { status: 500 });
  }
}