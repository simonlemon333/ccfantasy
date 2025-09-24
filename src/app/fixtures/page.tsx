'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getTeamInfo } from '../../lib/teamHelpers';

interface Fixture {
  id: number;                      // Now using FPL fixture ID (integer)
  gameweek: number;
  home_team: string;              // Team short name (e.g., "ARS", "MCI")
  away_team: string;              // Team short name (e.g., "CHE", "LIV")
  kickoff_time: string;
  home_score?: number;
  away_score?: number;
  finished: boolean;
  minutes_played: number;
}

interface PlayerEvent {
  id: string;
  player_name: string;
  team_name: string;
  event_type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'clean_sheet' | 'save' | 'penalty_miss' | 'own_goal' | 'bonus';
  minute?: number;
  points: number;
}

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedGameweek, setSelectedGameweek] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [fixtureEvents, setFixtureEvents] = useState<PlayerEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);


  useEffect(() => {
    fetchFixtures();
  }, [selectedGameweek]);


  const fetchFixtures = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/fixtures?gameweek=${selectedGameweek}`);
      const result = await response.json();
      
      if (result.success) {
        setFixtures(result.data || []);
      } else {
        console.error('Failed to fetch fixtures:', result.error);
      }
    } catch (error) {
      console.error('Error fetching fixtures:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFixtureEvents = async (fixtureId: string) => {
    setLoadingEvents(true);
    try {
      const response = await fetch(`/api/fixtures/${fixtureId}/events`);
      const result = await response.json();
      
      if (result.success) {
        // 将API返回的timeline转换为页面期望的格式
        const events = result.data.timeline?.map((event: any) => ({
          id: event.id,
          player_name: event.player.name,
          team_name: event.player.team,
          event_type: event.eventType,
          minute: event.minute,
          points: event.points
        })) || [];
        setFixtureEvents(events);
      } else {
        console.error('Failed to fetch fixture events:', result.error);
        setFixtureEvents([]);
      }
    } catch (error) {
      console.error('Error fetching fixture events:', error);
      setFixtureEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };


  const handleFixtureClick = async (fixture: Fixture) => {
    setSelectedFixture(fixture);
    if (fixture.finished) {
      await fetchFixtureEvents(fixture.id.toString());
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('zh-CN'),
      time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getGameweekOptions = () => {
    const options = [];
    for (let i = 1; i <= 38; i++) {
      options.push(i);
    }
    return options;
  };

  return (
    <Layout title="比赛赛程">
      <div className="container mx-auto px-6 py-8">
        
        {/* 头部控制 */}
        <div className="flex flex-wrap items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-800">比赛赛程</h1>
            <select
              value={selectedGameweek}
              onChange={(e) => setSelectedGameweek(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
            >
              {getGameweekOptions().map(gw => (
                <option key={gw} value={gw}>第 {gw} 轮</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={fetchFixtures} variant="outline" disabled={loading}>
              {loading ? '加载中...' : '刷新'}
            </Button>
          </div>
        </div>

        {/* 比赛列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-2xl">加载比赛数据中...</div>
          </div>
        ) : fixtures.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚽</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">第 {selectedGameweek} 轮暂无比赛数据</h3>
              <p className="text-gray-600">请尝试选择其他轮次或稍后再试</p>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fixtures.map((fixture) => {
              const { date, time } = formatDateTime(fixture.kickoff_time);
              const homeTeamInfo = getTeamInfo(fixture.home_team);
              const awayTeamInfo = getTeamInfo(fixture.away_team);

              return (
                <div
                  key={fixture.id}
                  className="bg-white p-6 rounded-lg border hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleFixtureClick(fixture)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-sm text-gray-600">
                      {date} • {time}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      fixture.finished ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {fixture.finished ? '已结束' : '未开始'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <div className="flex items-center justify-center mb-2">
                        {homeTeamInfo?.logo_url && (
                          <img
                            src={homeTeamInfo.logo_url}
                            alt={fixture.home_team}
                            className="w-6 h-6 object-contain mr-2"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="font-bold text-gray-800">
                          {fixture.home_team}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        {homeTeamInfo?.name || fixture.home_team}
                      </div>
                    </div>

                    <div className="text-center mx-4">
                      {fixture.finished ? (
                        <div className="text-2xl font-bold text-gray-800">
                          {fixture.home_score ?? 0} - {fixture.away_score ?? 0}
                        </div>
                      ) : (
                        <div className="text-lg text-gray-500">vs</div>
                      )}
                      {fixture.finished && fixture.minutes_played > 0 && (
                        <div className="text-xs text-gray-500">
                          {fixture.minutes_played}'
                        </div>
                      )}
                    </div>

                    <div className="text-center flex-1">
                      <div className="flex items-center justify-center mb-2">
                        {awayTeamInfo?.logo_url && (
                          <img
                            src={awayTeamInfo.logo_url}
                            alt={fixture.away_team}
                            className="w-6 h-6 object-contain mr-2"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="font-bold text-gray-800">
                          {fixture.away_team}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        {awayTeamInfo?.name || fixture.away_team}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 比赛详情模态框 */}
        {selectedFixture && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedFixture(null)}>
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">
                  {getTeamInfo(selectedFixture.home_team)?.name || selectedFixture.home_team} vs {getTeamInfo(selectedFixture.away_team)?.name || selectedFixture.away_team}
                </h3>
                <button
                  onClick={() => setSelectedFixture(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="text-center mb-6">
                <div className="text-sm text-gray-600 mb-2">
                  第 {selectedFixture.gameweek} 轮 • {formatDateTime(selectedFixture.kickoff_time).date} {formatDateTime(selectedFixture.kickoff_time).time}
                </div>
                {selectedFixture.finished ? (
                  <div className="text-4xl font-bold text-gray-800">
                    {selectedFixture.home_score ?? 0} - {selectedFixture.away_score ?? 0}
                  </div>
                ) : (
                  <div className="text-2xl text-gray-500">比赛未开始</div>
                )}
              </div>

              {selectedFixture.finished && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">比赛事件</h4>
                  {loadingEvents ? (
                    <div className="text-center py-4">加载比赛事件中...</div>
                  ) : fixtureEvents.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">暂无比赛事件数据</div>
                  ) : (
                    <div className="space-y-2">
                      {fixtureEvents.map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-mono bg-gray-200 px-2 py-1 rounded">
                              {event.minute}'
                            </div>
                            <div>
                              <div className="font-semibold">{event.player_name}</div>
                              <div className="text-sm text-gray-600">{event.team_name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold capitalize">
                              {event.event_type === 'goal' ? '⚽ 进球' :
                               event.event_type === 'assist' ? '🅰️ 助攻' :
                               event.event_type === 'yellow_card' ? '🟨 黄牌' :
                               event.event_type === 'red_card' ? '🟥 红牌' :
                               event.event_type === 'clean_sheet' ? '🧤 零失球' :
                               event.event_type}
                            </div>
                            <div className="text-sm text-green-600">+{event.points} 分</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}