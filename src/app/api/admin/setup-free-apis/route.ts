import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/setup-free-apis - Get setup guide for free APIs
export async function GET(request: NextRequest) {
  try {
    const setupGuide = {
      title: '免费API数据源配置指南',
      description: '避免收费的合法API数据源集成方案',
      freeApis: [
        {
          name: 'Football-Data.org',
          tier: '完全免费',
          limits: '10请求/分钟，无月限制',
          features: [
            '✅ 实时比分和赛果',
            '✅ 详细比赛事件(进球、红黄牌)',
            '✅ 未来fixtures安排',
            '✅ 球队和联赛数据',
            '✅ 支持多个联赛'
          ],
          setup: {
            url: 'https://www.football-data.org/client/register',
            steps: [
              '1. 访问 https://www.football-data.org/client/register',
              '2. 填写基本信息注册免费账户',
              '3. 获取API密钥',
              '4. 在环境变量中添加: FOOTBALL_DATA_API_KEY=your_key',
              '5. 重启应用即可使用'
            ],
            envVar: 'FOOTBALL_DATA_API_KEY',
            testUrl: '/api/admin/data-sources?action=test_football_data'
          },
          priority: 2,
          usage: '作为FPL API的备用数据源，补充缺失的比分和事件数据'
        },
        {
          name: 'TheSportsDB',
          tier: '完全免费',
          limits: '60请求/分钟，无月限制',
          features: [
            '✅ 基础比分数据',
            '✅ 球队信息和logo',
            '✅ 联赛数据',
            '✅ 历史数据',
            '❌ 无详细比赛事件'
          ],
          setup: {
            url: 'https://www.thesportsdb.com/api.php',
            steps: [
              '1. 无需注册，直接使用',
              '2. 公共API，完全免费',
              '3. 已集成在系统中',
              '4. 可选：支持付费版本获得更多功能'
            ],
            envVar: '无需配置',
            testUrl: '/api/admin/data-sources?action=test_thesportsdb'
          },
          priority: 5,
          usage: '用于获取球队logo和基础信息的备用方案'
        },
        {
          name: 'API-Sports (RapidAPI)',
          tier: '免费额度',
          limits: '100请求/天免费',
          features: [
            '✅ 实时比分',
            '✅ 比赛事件详情',
            '✅ 球员lineup',
            '✅ 详细统计',
            '⚠️ 需要RapidAPI账户'
          ],
          setup: {
            url: 'https://rapidapi.com/api-sports/api/api-football',
            steps: [
              '1. 注册RapidAPI账户',
              '2. 订阅API-Football (选择FREE plan)',
              '3. 获取RapidAPI密钥',
              '4. 在环境变量中添加: RAPID_API_KEY=your_key',
              '5. 注意每天100次限制'
            ],
            envVar: 'RAPID_API_KEY',
            testUrl: '/api/admin/data-sources?action=test_rapid_api'
          },
          priority: 4,
          usage: '小心使用，适合获取重要比赛的详细数据'
        }
      ],
      currentStatus: {
        active: ['FPL API (主数据源)'],
        inactive: ['Football-Data.org', 'TheSportsDB', 'API-Sports'],
        recommendation: 'Add FOOTBALL_DATA_API_KEY for best coverage'
      },
      fallbackStrategy: {
        description: '数据源优先级和失败回退策略',
        priority: [
          '1. FPL API - 主要数据源',
          '2. Football-Data.org - 备用比分和事件',
          '3. TheSportsDB - 基础数据备份',
          '4. API-Sports - 详细数据(限量)'
        ],
        fallbackLogic: [
          '如果FPL API缺少比分 → 使用Football-Data.org',
          '如果需要比赛事件详情 → 使用Football-Data.org',
          '如果需要未来fixtures → 使用Football-Data.org',
          '如果所有免费源都失败 → 显示警告但不影响核心功能'
        ]
      },
      costAnalysis: {
        monthlyEstimate: '$0',
        breakdown: [
          'FPL API: 免费无限制',
          'Football-Data.org: 免费 (10请求/分钟)',
          'TheSportsDB: 免费无限制',
          'API-Sports: 免费 (100请求/天)',
          '总计: 完全免费方案'
        ],
        riskAssessment: [
          '✅ 无财务风险',
          '✅ 所有API都有免费方案',
          '⚠️ 注意Football-Data.org的10/分钟限制',
          '⚠️ API-Sports每日限额100次'
        ]
      },
      nextSteps: [
        '1. 注册Football-Data.org获取免费API密钥',
        '2. 配置环境变量FOOTBALL_DATA_API_KEY',
        '3. 测试API集成',
        '4. 实现数据源fallback机制',
        '5. 监控API使用量避免超限'
      ]
    };

    return NextResponse.json({
      success: true,
      data: setupGuide
    });

  } catch (error) {
    console.error('Setup guide error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get setup guide'
    }, { status: 500 });
  }
}

// POST /api/admin/setup-free-apis - Test free API connections
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    switch (action) {
      case 'test_all':
        // Test TheSportsDB (no auth needed)
        try {
          const theSportsDbResponse = await fetch('https://www.thesportsdb.com/api/v1/json/3/search_all_leagues.php?c=England');
          if (theSportsDbResponse.ok) {
            const data = await theSportsDbResponse.json();
            testResults.tests.push({
              api: 'TheSportsDB',
              success: true,
              message: `Found ${data.countrys?.length || 0} leagues`,
              configured: true
            });
          }
        } catch (error) {
          testResults.tests.push({
            api: 'TheSportsDB',
            success: false,
            message: error.message,
            configured: true
          });
        }

        // Test Football-Data.org (requires API key)
        const footballDataKey = process.env.FOOTBALL_DATA_API_KEY;
        if (footballDataKey) {
          try {
            const footballDataResponse = await fetch('https://api.football-data.org/v4/competitions/PL/matches?limit=1', {
              headers: {
                'X-Auth-Token': footballDataKey
              }
            });
            if (footballDataResponse.ok) {
              const data = await footballDataResponse.json();
              testResults.tests.push({
                api: 'Football-Data.org',
                success: true,
                message: `API响应正常，找到${data.count}场比赛`,
                configured: true
              });
            }
          } catch (error) {
            testResults.tests.push({
              api: 'Football-Data.org',
              success: false,
              message: error.message,
              configured: true
            });
          }
        } else {
          testResults.tests.push({
            api: 'Football-Data.org',
            success: false,
            message: '需要配置FOOTBALL_DATA_API_KEY环境变量',
            configured: false
          });
        }

        // Test API-Sports (requires RapidAPI key)
        const rapidApiKey = process.env.RAPID_API_KEY;
        if (rapidApiKey) {
          try {
            const apiSportsResponse = await fetch('https://api-football-v1.p.rapidapi.com/v3/timezone', {
              headers: {
                'X-RapidAPI-Key': rapidApiKey,
                'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
              }
            });
            if (apiSportsResponse.ok) {
              testResults.tests.push({
                api: 'API-Sports',
                success: true,
                message: 'API响应正常',
                configured: true
              });
            }
          } catch (error) {
            testResults.tests.push({
              api: 'API-Sports',
              success: false,
              message: error.message,
              configured: true
            });
          }
        } else {
          testResults.tests.push({
            api: 'API-Sports',
            success: false,
            message: '需要配置RAPID_API_KEY环境变量',
            configured: false
          });
        }

        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown test action'
        }, { status: 400 });
    }

    const summary = {
      total: testResults.tests.length,
      passed: testResults.tests.filter(t => t.success).length,
      failed: testResults.tests.filter(t => !t.success).length,
      needsSetup: testResults.tests.filter(t => !t.configured).length
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        testResults,
        recommendations: [
          summary.needsSetup > 0 ? '配置缺失的API密钥以启用更多数据源' : '所有配置的API都在正常工作',
          summary.failed > 0 ? '检查失败的API连接和密钥配置' : '所有API连接正常'
        ]
      }
    });

  } catch (error) {
    console.error('API test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test APIs'
    }, { status: 500 });
  }
}