'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getTeamInfo } from '../../lib/teamHelpers';

interface Fixture {
  id: number;
  gameweek: number;
  home_team: string;
  away_team: string;
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
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [fixtureEvents, setFixtureEvents] = useState<PlayerEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [initDone, setInitDone] = useState(false);

  // On mount: detect the most recent finished gameweek
  useEffect(() => {
    const detectCurrentGameweek = async () => {
      try {
        // Fetch a broad set of fixtures to find the latest finished GW
        const res = await fetch('/api/fixtures?limit=380');
        const result = await res.json();
        if (result.success && result.data?.length > 0) {
          const allFixtures = result.data as Fixture[];
          // Find the highest gameweek that has at least one finished match
          const finishedGWs = allFixtures
            .filter((f: Fixture) => f.finished)
            .map((f: Fixture) => f.gameweek);
          if (finishedGWs.length > 0) {
            const latestFinishedGW = Math.max(...finishedGWs);
            setSelectedGameweek(latestFinishedGW);
          } else {
            // No finished matches yet, show GW1
            setSelectedGameweek(1);
          }
        } else {
          setSelectedGameweek(1);
        }
      } catch {
        setSelectedGameweek(1);
      } finally {
        setInitDone(true);
      }
    };
    detectCurrentGameweek();
  }, []);

  // Fetch fixtures when gameweek changes
  useEffect(() => {
    if (selectedGameweek === null) return;
    fetchFixtures();
  }, [selectedGameweek]);

  const fetchFixtures = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/fixtures?gameweek=${selectedGameweek}`);
      const result = await response.json();
      if (result.success) {
        setFixtures(result.data || []);
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
        setFixtureEvents([]);
      }
    } catch {
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

  const gw = selectedGameweek ?? 1;

  return (
    <Layout title="比赛赛程">
      <div className="container mx-auto px-6 py-8">

        {/* Header with prev/next buttons */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedGameweek(Math.max(1, gw - 1))}
              disabled={gw <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>

            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-4 py-1.5 rounded-xl font-black text-lg shadow-lg shadow-blue-600/20">
                GW{gw}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">第 {gw} 轮</h1>
                <p className="text-xs text-gray-500">2025/26 英超赛季</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedGameweek(Math.min(38, gw + 1))}
              disabled={gw >= 38}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={gw}
              onChange={(e) => setSelectedGameweek(parseInt(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm"
            >
              {Array.from({ length: 38 }, (_, i) => i + 1).map(g => (
                <option key={g} value={g}>第 {g} 轮</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fixtures grid */}
        {(loading || !initDone) ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              加载比赛数据中...
            </div>
          </div>
        ) : fixtures.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-5xl mb-4">⚽</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">第 {gw} 轮暂无比赛数据</h3>
              <p className="text-gray-500 text-sm">请尝试选择其他轮次</p>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fixtures.map((fixture) => {
              const { date, time } = formatDateTime(fixture.kickoff_time);
              const homeTeamInfo = getTeamInfo(fixture.home_team);
              const awayTeamInfo = getTeamInfo(fixture.away_team);

              return (
                <div
                  key={fixture.id}
                  className="bg-white p-5 rounded-xl border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all cursor-pointer"
                  onClick={() => handleFixtureClick(fixture)}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-xs text-gray-500">
                      {date} · {time}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      fixture.finished ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {fixture.finished ? '已结束' : '未开始'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {homeTeamInfo?.logo_url && (
                          <img src={homeTeamInfo.logo_url} alt="" className="w-7 h-7 object-contain" />
                        )}
                        <div className="font-bold text-sm text-gray-800">{fixture.home_team}</div>
                      </div>
                      <div className="text-[11px] text-gray-500">{homeTeamInfo?.name || fixture.home_team}</div>
                    </div>

                    <div className="text-center mx-3">
                      {fixture.finished ? (
                        <div className="inline-flex items-center gap-1 bg-gray-900 text-white px-3 py-1 rounded-lg font-mono font-bold text-lg tracking-wider">
                          <span>{fixture.home_score ?? 0}</span>
                          <span className="text-gray-500">-</span>
                          <span>{fixture.away_score ?? 0}</span>
                        </div>
                      ) : (
                        <div className="text-base text-gray-400 font-semibold">vs</div>
                      )}
                    </div>

                    <div className="text-center flex-1">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="font-bold text-sm text-gray-800">{fixture.away_team}</div>
                        {awayTeamInfo?.logo_url && (
                          <img src={awayTeamInfo.logo_url} alt="" className="w-7 h-7 object-contain" />
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500">{awayTeamInfo?.name || fixture.away_team}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom nav hint */}
        {!loading && initDone && fixtures.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-8 text-sm text-gray-400">
            {gw > 1 && (
              <button onClick={() => setSelectedGameweek(gw - 1)} className="hover:text-blue-600 transition-colors">
                ← 第 {gw - 1} 轮
              </button>
            )}
            {gw < 38 && (
              <button onClick={() => setSelectedGameweek(gw + 1)} className="hover:text-blue-600 transition-colors">
                第 {gw + 1} 轮 →
              </button>
            )}
          </div>
        )}

        {/* Match detail modal */}
        {selectedFixture && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedFixture(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">
                  {getTeamInfo(selectedFixture.home_team)?.name || selectedFixture.home_team} vs {getTeamInfo(selectedFixture.away_team)?.name || selectedFixture.away_team}
                </h3>
                <button
                  onClick={() => setSelectedFixture(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="text-sm text-gray-500 mb-3">
                  第 {selectedFixture.gameweek} 轮 · {formatDateTime(selectedFixture.kickoff_time).date} {formatDateTime(selectedFixture.kickoff_time).time}
                </div>
                <div className="flex items-center justify-center gap-4">
                  {getTeamInfo(selectedFixture.home_team)?.logo_url && (
                    <img src={getTeamInfo(selectedFixture.home_team)!.logo_url} alt="" className="w-12 h-12 object-contain" />
                  )}
                  {selectedFixture.finished ? (
                    <div className="text-4xl font-black text-gray-800">
                      {selectedFixture.home_score ?? 0} - {selectedFixture.away_score ?? 0}
                    </div>
                  ) : (
                    <div className="text-2xl text-gray-400 font-semibold">vs</div>
                  )}
                  {getTeamInfo(selectedFixture.away_team)?.logo_url && (
                    <img src={getTeamInfo(selectedFixture.away_team)!.logo_url} alt="" className="w-12 h-12 object-contain" />
                  )}
                </div>
              </div>

              {selectedFixture.finished && (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3">比赛事件</h4>
                  {loadingEvents ? (
                    <div className="text-center py-4 text-gray-400 text-sm">加载比赛事件中...</div>
                  ) : fixtureEvents.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-sm">暂无比赛事件数据</div>
                  ) : (
                    <div className="space-y-2">
                      {fixtureEvents.map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="text-xs font-mono bg-gray-200 px-2 py-1 rounded-lg font-bold">
                              {event.minute}'
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{event.player_name}</div>
                              <div className="text-xs text-gray-500">{event.team_name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">
                              {event.event_type === 'goal' ? '⚽ 进球' :
                               event.event_type === 'assist' ? '🅰️ 助攻' :
                               event.event_type === 'yellow_card' ? '🟨 黄牌' :
                               event.event_type === 'red_card' ? '🟥 红牌' :
                               event.event_type === 'clean_sheet' ? '🧤 零失球' :
                               event.event_type}
                            </div>
                            <div className="text-xs text-green-600 font-medium">+{event.points} 分</div>
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
