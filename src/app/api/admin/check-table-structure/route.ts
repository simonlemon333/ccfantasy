import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/admin/check-table-structure - 检查当前表结构
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 检查当前数据库表结构...');

    // 检查teams表结构
    const { data: teamsStructure, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .limit(1);

    // 检查players表结构
    const { data: playersStructure, error: playersError } = await supabase
      .from('players')
      .select('*')
      .limit(1);

    // 检查fixtures表结构
    const { data: fixturesStructure, error: fixturesError } = await supabase
      .from('fixtures')
      .select('*')
      .limit(1);

    // 获取行数统计
    const { count: teamsCount } = await supabase
      .from('teams')
      .select('id', { count: 'exact', head: true });

    const { count: playersCount } = await supabase
      .from('players')
      .select('id', { count: 'exact', head: true });

    const { count: fixturesCount } = await supabase
      .from('fixtures')
      .select('id', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      data: {
        teams: {
          count: teamsCount,
          structure: teamsStructure?.[0] || 'No data',
          error: teamsError?.message || null
        },
        players: {
          count: playersCount,
          structure: playersStructure?.[0] || 'No data',
          error: playersError?.message || null
        },
        fixtures: {
          count: fixturesCount,
          structure: fixturesStructure?.[0] || 'No data',
          error: fixturesError?.message || null
        }
      }
    });

  } catch (error) {
    console.error('❌ 检查表结构失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}