import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/requireAdminAuth';

// POST /api/admin/simple-fixtures-update - 使用新表结构的简化更新
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  try {
    console.log('🚀 开始简化赛事更新...');

    // 获取FPL fixtures数据
    const fixturesResponse = await fetch('https://fantasy.premierleague.com/api/fixtures/');
    const fplFixtures = await fixturesResponse.json();

    console.log(`📊 获取到 ${fplFixtures.length} 场FPL比赛数据`);

    // 获取FPL teams数据，用于team ID到short_name的映射
    const teamsResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    const fplData = await teamsResponse.json();
    const fplTeams = fplData.teams;

    // 创建FPL team ID到short_name的映射
    const teamIdToShortName = new Map();
    fplTeams.forEach((team: any) => {
      teamIdToShortName.set(team.id, team.short_name);
    });

    console.log(`🏟️  FPL队伍映射: ${teamIdToShortName.size} 支队伍`);

    let updatedCount = 0;
    let insertedCount = 0;
    let skippedCount = 0;

    // 处理所有比赛
    for (const fplFixture of fplFixtures) {
      const homeTeamShort = teamIdToShortName.get(fplFixture.team_h);
      const awayTeamShort = teamIdToShortName.get(fplFixture.team_a);

      if (!homeTeamShort || !awayTeamShort) {
        console.log(`⚠️  跳过未知队伍: FPL ${fplFixture.team_h} vs ${fplFixture.team_a}`);
        skippedCount++;
        continue;
      }

      // 检查数据库中是否已存在此fixture
      const { data: existingFixtures } = await supabase
        .from('fixtures')
        .select('id, home_score, away_score, finished')
        .eq('id', fplFixture.id)
        .limit(1);

      if (existingFixtures && existingFixtures.length > 0) {
        // 更新现有fixture
        const existing = existingFixtures[0];

        // 检查是否需要更新
        const needsUpdate =
          (fplFixture.finished && !existing.finished) ||
          (fplFixture.team_h_score !== existing.home_score) ||
          (fplFixture.team_a_score !== existing.away_score);

        if (needsUpdate) {
          const { error } = await supabase
            .from('fixtures')
            .update({
              home_score: fplFixture.team_h_score,
              away_score: fplFixture.team_a_score,
              finished: fplFixture.finished,
              minutes_played: fplFixture.finished ? 90 : 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', fplFixture.id);

          if (!error) {
            updatedCount++;
            if (fplFixture.finished) {
              console.log(`✅ 更新: ${homeTeamShort} ${fplFixture.team_h_score}-${fplFixture.team_a_score} ${awayTeamShort} (GW${fplFixture.event})`);
            }
          } else {
            console.log(`❌ 更新失败: ${homeTeamShort} vs ${awayTeamShort} - ${error.message}`);
          }
        }
      } else {
        // 插入新fixture
        const { error } = await supabase
          .from('fixtures')
          .insert({
            id: fplFixture.id,
            gameweek: fplFixture.event || 1,
            home_team: homeTeamShort,
            away_team: awayTeamShort,
            kickoff_time: fplFixture.kickoff_time,
            home_score: fplFixture.team_h_score,
            away_score: fplFixture.team_a_score,
            finished: fplFixture.finished || false,
            minutes_played: fplFixture.finished ? 90 : 0
          });

        if (!error) {
          insertedCount++;
          console.log(`➕ 新增: ${homeTeamShort} vs ${awayTeamShort} (GW${fplFixture.event})`);
        } else {
          console.log(`❌ 插入失败: ${homeTeamShort} vs ${awayTeamShort} - ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `简化更新完成！\n• 插入了 ${insertedCount} 场新比赛\n• 更新了 ${updatedCount} 场比赛\n• 跳过了 ${skippedCount} 场比赛`,
        insertedFixtures: insertedCount,
        updatedFixtures: updatedCount,
        skippedFixtures: skippedCount,
        totalProcessed: fplFixtures.length
      }
    });

  } catch (error) {
    console.error('❌ 简化更新失败:', error);
    return NextResponse.json({
      success: false,
      error: `简化更新失败: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}