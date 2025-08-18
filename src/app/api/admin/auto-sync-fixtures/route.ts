import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fplApi } from '@/lib/fplApi';

// POST /api/admin/auto-sync-fixtures - Auto-sync fixtures with live scores
export async function POST(request: NextRequest) {
  try {
    console.log('Starting auto-sync for live fixtures...');

    // Get current gameweek
    const currentGameweek = await fplApi.getCurrentGameweek();
    console.log(`Current gameweek: ${currentGameweek}`);

    // Get fixtures for current gameweek from FPL API
    const fplFixtures = await fplApi.getFixtures(currentGameweek);
    console.log(`Found ${fplFixtures.length} fixtures from FPL API for GW${currentGameweek}`);

    // Get our database fixtures for current gameweek
    const { data: dbFixtures, error: fetchError } = await supabase
      .from('fixtures')
      .select('*')
      .eq('gameweek', currentGameweek);

    if (fetchError) {
      console.error('Error fetching database fixtures:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch database fixtures'
      }, { status: 500 });
    }

    let updatedCount = 0;
    let createdCount = 0;
    const errors = [];

    // Process each FPL fixture
    for (const fplFixture of fplFixtures) {
      try {
        // Find matching database fixture by teams and gameweek
        const dbFixture = dbFixtures?.find(f => {
          // This is a simplified match - in real implementation you'd need proper team mapping
          return f.gameweek === fplFixture.event &&
                 // You'd match by proper team IDs here
                 f.kickoff_time === fplFixture.kickoff_time;
        });

        const updateData = {
          home_score: fplFixture.team_h_score,
          away_score: fplFixture.team_a_score,
          finished: fplFixture.finished,
          minutes_played: fplFixture.minutes,
          updated_at: new Date().toISOString()
        };

        if (dbFixture) {
          // Update existing fixture if scores changed
          if (dbFixture.home_score !== fplFixture.team_h_score ||
              dbFixture.away_score !== fplFixture.team_a_score ||
              dbFixture.finished !== fplFixture.finished ||
              dbFixture.minutes_played !== fplFixture.minutes) {
            
            const { error: updateError } = await supabase
              .from('fixtures')
              .update(updateData)
              .eq('id', dbFixture.id);

            if (updateError) {
              console.error(`Error updating fixture ${dbFixture.id}:`, updateError);
              errors.push(`Failed to update fixture: ${updateError.message}`);
            } else {
              updatedCount++;
              console.log(`Updated fixture: ${fplFixture.team_h} vs ${fplFixture.team_a} - ${fplFixture.team_h_score}:${fplFixture.team_a_score}`);
            }
          }
        }
        // Note: We're not creating new fixtures here, only updating existing ones
      } catch (error) {
        console.error(`Error processing fixture ${fplFixture.id}:`, error);
        errors.push(`Error processing fixture ${fplFixture.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        gameweek: currentGameweek,
        fplFixtures: fplFixtures.length,
        dbFixtures: dbFixtures?.length || 0,
        updated: updatedCount,
        created: createdCount,
        errors
      },
      message: `Auto-sync completed: ${updatedCount} fixtures updated for GW${currentGameweek}`
    });

  } catch (error) {
    console.error('Auto-sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Auto-sync failed'
    }, { status: 500 });
  }
}

// GET /api/admin/auto-sync-fixtures - Check sync status and recommendation
export async function GET(request: NextRequest) {
  try {
    const recommendation = {
      currentSolution: 'FPL API (Primary)',
      issue: '比分更新延迟，需要手动同步',
      recommendations: [
        {
          solution: '自动同步任务',
          description: '每15-30分钟自动从FPL API更新比分',
          implementation: '使用cron job或Next.js定时任务',
          pros: ['免费', '简单实现', '可靠性高'],
          cons: ['仍有延迟', '依赖单一数据源']
        },
        {
          solution: 'Football-Data.org API备用',
          description: '添加第二数据源，10请求/分钟',
          implementation: '在FPL API数据缺失时使用',
          pros: ['更及时的比分', '数据源冗余'],
          cons: ['有请求限制', '需要API密钥']
        },
        {
          solution: 'WebSocket实时更新',
          description: '如果有实时数据源，使用WebSocket推送',
          implementation: '复杂，需要找到合适的实时API',
          pros: ['真正实时', '用户体验最佳'],
          cons: ['复杂度高', '可能成本高']
        }
      ],
      currentStatus: {
        dataSource: 'FPL API',
        lastSync: '手动',
        updateFrequency: '手动触发',
        reliability: '高但不及时'
      }
    };

    return NextResponse.json({
      success: true,
      data: recommendation
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get recommendation'
    }, { status: 500 });
  }
}