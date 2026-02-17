import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fplApi } from '@/lib/fplApi';
import { requireAdminAuth } from '@/lib/requireAdminAuth';

// POST /api/admin/quick-fixtures-update - 快速更新赛事比分
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  try {
    console.log('开始快速赛事更新...');

    // 获取FPL teams和fixtures数据
    const [teamsResponse, fixturesResponse] = await Promise.all([
      fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
      fetch('https://fantasy.premierleague.com/api/fixtures/')
    ]);

    const fplData = await teamsResponse.json();
    const fplFixtures = await fixturesResponse.json();

    console.log(`获取到 ${fplFixtures.length} 场比赛数据`);

    // 获取所有数据库中的队伍信息
    const { data: dbTeams } = await supabase
      .from('teams')
      .select('id, name, short_name');

    // 创建数据库team ID到team信息的映射
    const dbTeamMap = new Map();
    dbTeams?.forEach(team => {
      dbTeamMap.set(team.id, {
        name: team.name,
        short_name: team.short_name
      });
    });

    let updatedCount = 0;
    let skippedCount = 0;

    // 只更新已经结束的比赛的比分
    for (const fplFixture of fplFixtures) {
      if (fplFixture.finished && fplFixture.team_h_score !== null && fplFixture.team_a_score !== null) {

        // 使用FPL API映射获取数据库team ID
        const homeTeamId = fplApi.mapTeamToUuid(fplFixture.team_h);
        const awayTeamId = fplApi.mapTeamToUuid(fplFixture.team_a);

        // 获取队伍名称用于日志
        const homeTeam = dbTeamMap.get(homeTeamId);
        const awayTeam = dbTeamMap.get(awayTeamId);

        if (!homeTeam || !awayTeam) {
          console.log(`⚠️  跳过未知队伍: FPL ${fplFixture.team_h} vs ${fplFixture.team_a} -> ${homeTeamId} vs ${awayTeamId} (GW${fplFixture.event})`);
          skippedCount++;
          continue;
        }

        // 通过主客队ID和gameweek精确查找fixture
        const { data: existingFixtures } = await supabase
          .from('fixtures')
          .select('id, gameweek, home_score, away_score, home_team_id, away_team_id')
          .eq('gameweek', fplFixture.event || 1)
          .eq('home_team_id', homeTeamId)
          .eq('away_team_id', awayTeamId)
          .limit(1);

        if (existingFixtures && existingFixtures.length > 0) {
          const fixture = existingFixtures[0];

          // 如果比分不同，则更新
          if (fixture.home_score !== fplFixture.team_h_score ||
              fixture.away_score !== fplFixture.team_a_score) {

            const { error } = await supabase
              .from('fixtures')
              .update({
                home_score: fplFixture.team_h_score,
                away_score: fplFixture.team_a_score,
                finished: true,
                minutes_played: 90
              })
              .eq('id', fixture.id);

            if (!error) {
              updatedCount++;
              console.log(`✅ 更新成功: ${homeTeam.short_name} ${fplFixture.team_h_score}-${fplFixture.team_a_score} ${awayTeam.short_name} (GW${fplFixture.event})`);
            } else {
              console.log(`❌ 更新失败: ${homeTeam.short_name} vs ${awayTeam.short_name} - ${error.message}`);
            }
          }
        } else {
          console.log(`⚠️  跳过未找到: ${homeTeam.short_name} vs ${awayTeam.short_name} (GW${fplFixture.event})`);
          skippedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `快速更新完成！\n• 更新了 ${updatedCount} 场比赛\n• 跳过了 ${skippedCount} 场比赛（无匹配或无变化）`,
        updatedFixtures: updatedCount,
        skippedFixtures: skippedCount,
        totalFinished: fplFixtures.filter(f => f.finished).length
      }
    });

  } catch (error) {
    console.error('快速赛事更新失败:', error);
    return NextResponse.json({
      success: false,
      error: `快速更新失败: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}