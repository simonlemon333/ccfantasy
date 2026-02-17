import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fplApi } from '@/lib/fplApi';
import { requireAdminAuth } from '@/lib/requireAdminAuth';

// POST /api/admin/debug-fixtures-update - 调试版本的快速更新
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  try {
    console.log('🔍 开始调试赛事更新...');

    // 获取FPL fixtures数据
    const fixturesResponse = await fetch('https://fantasy.premierleague.com/api/fixtures/');
    const fplFixtures = await fixturesResponse.json();

    console.log(`📊 获取到 ${fplFixtures.length} 场FPL比赛数据`);

    // 统计已完成的比赛
    const finishedFixtures = fplFixtures.filter(f => f.finished && f.team_h_score !== null && f.team_a_score !== null);
    console.log(`✅ 其中已完成比赛: ${finishedFixtures.length} 场`);

    // 获取数据库中的队伍信息
    const { data: dbTeams } = await supabase
      .from('teams')
      .select('id, name, short_name');

    console.log(`🏟️  数据库中的队伍数量: ${dbTeams?.length}`);

    // 检查队伍映射
    const fplTeamMapping = fplApi.getTeamMapping();
    console.log('🔗 FPL队伍映射:', fplTeamMapping);

    // 创建数据库team ID到team信息的映射
    const dbTeamMap = new Map();
    dbTeams?.forEach(team => {
      dbTeamMap.set(team.id, {
        name: team.name,
        short_name: team.short_name
      });
    });

    // 检查数据库中的fixtures数据
    const { data: allFixtures, error: fixturesError } = await supabase
      .from('fixtures')
      .select('id, gameweek, home_team_id, away_team_id, home_score, away_score, finished')
      .order('gameweek', { ascending: true });

    if (fixturesError) {
      console.error('❌ 查询fixtures失败:', fixturesError);
      return NextResponse.json({ success: false, error: fixturesError.message });
    }

    console.log(`🎯 数据库中的fixtures数量: ${allFixtures?.length}`);

    // 按gameweek统计
    const fixturesByGW = {};
    allFixtures?.forEach(f => {
      if (!fixturesByGW[f.gameweek]) {
        fixturesByGW[f.gameweek] = 0;
      }
      fixturesByGW[f.gameweek]++;
    });
    console.log('📈 各gameweek的fixtures数量:', fixturesByGW);

    let foundMatches = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // 只分析前10场已完成的比赛
    const sampleFixtures = finishedFixtures.slice(0, 10);
    console.log(`🔍 分析前${sampleFixtures.length}场已完成比赛...`);

    for (const fplFixture of sampleFixtures) {
      console.log(`\n--- 分析比赛 FPL ID: ${fplFixture.id} ---`);
      console.log(`FPL队伍: ${fplFixture.team_h} vs ${fplFixture.team_a} (GW${fplFixture.event})`);
      console.log(`比分: ${fplFixture.team_h_score}-${fplFixture.team_a_score}`);

      // 使用FPL API映射获取数据库team ID
      const homeTeamId = fplApi.mapTeamToUuid(fplFixture.team_h);
      const awayTeamId = fplApi.mapTeamToUuid(fplFixture.team_a);

      console.log(`映射到数据库ID: ${homeTeamId} vs ${awayTeamId}`);

      // 获取队伍名称
      const homeTeam = dbTeamMap.get(homeTeamId);
      const awayTeam = dbTeamMap.get(awayTeamId);

      if (!homeTeam || !awayTeam) {
        console.log(`❌ 无法找到队伍信息`);
        skippedCount++;
        continue;
      }

      console.log(`队伍名称: ${homeTeam.short_name} vs ${awayTeam.short_name}`);

      // 查找匹配的fixture
      const { data: existingFixtures } = await supabase
        .from('fixtures')
        .select('id, gameweek, home_score, away_score, home_team_id, away_team_id')
        .eq('gameweek', fplFixture.event || 1)
        .eq('home_team_id', homeTeamId)
        .eq('away_team_id', awayTeamId);

      console.log(`数据库查询结果: ${existingFixtures?.length} 条记录`);

      if (existingFixtures && existingFixtures.length > 0) {
        foundMatches++;
        const fixture = existingFixtures[0];
        console.log(`✅ 找到匹配: DB ID ${fixture.id}, 当前比分: ${fixture.home_score}-${fixture.away_score}`);

        // 检查是否需要更新
        if (fixture.home_score !== fplFixture.team_h_score ||
            fixture.away_score !== fplFixture.team_a_score) {
          console.log(`🔄 需要更新比分从 ${fixture.home_score}-${fixture.away_score} 到 ${fplFixture.team_h_score}-${fplFixture.team_a_score}`);
          updatedCount++;
        } else {
          console.log(`✓ 比分已是最新`);
        }
      } else {
        console.log(`❌ 未找到匹配的fixture`);
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        totalFplFixtures: fplFixtures.length,
        finishedFplFixtures: finishedFixtures.length,
        dbTeamsCount: dbTeams?.length,
        dbFixturesCount: allFixtures?.length,
        fixturesByGameweek: fixturesByGW,
        sampleAnalysis: {
          analyzed: sampleFixtures.length,
          foundMatches,
          needUpdate: updatedCount,
          skipped: skippedCount
        },
        fplTeamMapping: Object.keys(fplTeamMapping).length
      }
    });

  } catch (error) {
    console.error('❌ 调试失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}