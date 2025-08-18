'use client';

import { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

interface Team {
  id: string;
  name: string;
  short_name: string;
}

interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  teams: Team;
}

interface Fixture {
  id: string;
  gameweek: number;
  home_team: Team;
  away_team: Team;
  kickoff_time: string;
  home_score?: number;
  away_score?: number;
  finished: boolean;
}

interface EventForm {
  player_id: string;
  event_type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'clean_sheet' | 'save' | 'penalty_miss' | 'own_goal' | 'bonus';
  minute: number;
  points: number;
}

export default function AdminFixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>({
    player_id: '',
    event_type: 'goal',
    minute: 0,
    points: 0
  });
  const [loading, setLoading] = useState(false);
  const [gameweek, setGameweek] = useState(1);

  useEffect(() => {
    fetchFixtures();
    fetchPlayers();
  }, [gameweek]);

  const fetchFixtures = async () => {
    try {
      const response = await fetch(`/api/fixtures?gameweek=${gameweek}`);
      const result = await response.json();
      if (result.success) {
        setFixtures(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching fixtures:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players?limit=500');
      const result = await response.json();
      if (result.success) {
        setPlayers(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFixture) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/fixtures/${selectedFixture.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [eventForm]
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('比赛事件添加成功！');
        setEventForm({
          player_id: '',
          event_type: 'goal',
          minute: 0,
          points: 0
        });
      } else {
        alert(`添加失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adding event:', error);
      alert('添加事件时出错');
    } finally {
      setLoading(false);
    }
  };

  const getEventPoints = (eventType: string) => {
    const pointsMap: Record<string, number> = {
      goal: 5,
      assist: 3,
      clean_sheet: 4,
      save: 1,
      yellow_card: -1,
      red_card: -3,
      penalty_miss: -2,
      own_goal: -2,
      bonus: 1
    };
    return pointsMap[eventType] || 0;
  };

  const updateResult = async (fixture: Fixture, homeScore: number, awayScore: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/fixtures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixtures: [{
            id: fixture.id,
            gameweek: fixture.gameweek,
            home_team_id: fixture.home_team.id,
            away_team_id: fixture.away_team.id,
            kickoff_time: fixture.kickoff_time,
            home_score: homeScore,
            away_score: awayScore,
            finished: true,
            minutes_played: 90
          }]
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('比赛结果更新成功！');
        fetchFixtures();
      } else {
        alert(`更新失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating result:', error);
      alert('更新比赛结果时出错');
    } finally {
      setLoading(false);
    }
  };

  // Filter players by teams in selected fixture
  const getFixturePlayers = () => {
    if (!selectedFixture) return [];
    return players.filter(player => 
      player.teams.id === selectedFixture.home_team.id || 
      player.teams.id === selectedFixture.away_team.id
    );
  };

  return (
    <Layout title="比赛管理">
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">比赛事件管理</h1>
          <select
            value={gameweek}
            onChange={(e) => setGameweek(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            {Array.from({length: 38}, (_, i) => i + 1).map(gw => (
              <option key={gw} value={gw}>第 {gw} 轮</option>
            ))}
          </select>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 比赛列表 */}
          <Card>
            <h2 className="text-xl font-bold mb-4">第 {gameweek} 轮比赛</h2>
            
            {fixtures.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无比赛数据
              </div>
            ) : (
              <div className="space-y-4">
                {fixtures.map((fixture) => (
                  <div 
                    key={fixture.id} 
                    className={`p-4 border rounded-lg cursor-pointer transition ${
                      selectedFixture?.id === fixture.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedFixture(fixture)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm text-gray-600">
                        {new Date(fixture.kickoff_time).toLocaleString('zh-CN')}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        fixture.finished ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {fixture.finished ? '已结束' : '未开始'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-center">
                        <div className="font-bold">{fixture.home_team.short_name}</div>
                      </div>
                      <div className="text-center mx-4">
                        {fixture.finished ? (
                          <div className="text-xl font-bold">
                            {fixture.home_score} - {fixture.away_score}
                          </div>
                        ) : (
                          <div className="text-gray-500">vs</div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{fixture.away_team.short_name}</div>
                      </div>
                    </div>

                    {!fixture.finished && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="number"
                          placeholder="主队比分"
                          className="flex-1 px-2 py-1 border rounded text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const homeScore = parseInt((e.target as HTMLInputElement).value) || 0;
                              const awayInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                              const awayScore = parseInt(awayInput?.value) || 0;
                              updateResult(fixture, homeScore, awayScore);
                            }
                          }}
                        />
                        <input
                          type="number"
                          placeholder="客队比分"
                          className="flex-1 px-2 py-1 border rounded text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const awayScore = parseInt((e.target as HTMLInputElement).value) || 0;
                              const homeInput = e.currentTarget.previousElementSibling as HTMLInputElement;
                              const homeScore = parseInt(homeInput?.value) || 0;
                              updateResult(fixture, homeScore, awayScore);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 事件添加表单 */}
          <Card>
            <h2 className="text-xl font-bold mb-4">
              {selectedFixture ? `添加比赛事件 - ${selectedFixture.home_team.short_name} vs ${selectedFixture.away_team.short_name}` : '选择比赛添加事件'}
            </h2>
            
            {selectedFixture ? (
              <form onSubmit={handleEventSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">球员</label>
                  <select
                    value={eventForm.player_id}
                    onChange={(e) => setEventForm(prev => ({ ...prev, player_id: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">选择球员</option>
                    {getFixturePlayers().map(player => (
                      <option key={player.id} value={player.id}>
                        {player.name} ({player.teams.short_name}) - {player.position}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">事件类型</label>
                  <select
                    value={eventForm.event_type}
                    onChange={(e) => {
                      const eventType = e.target.value as EventForm['event_type'];
                      setEventForm(prev => ({ 
                        ...prev, 
                        event_type: eventType,
                        points: getEventPoints(eventType)
                      }));
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="goal">⚽ 进球 (+5分)</option>
                    <option value="assist">🅰️ 助攻 (+3分)</option>
                    <option value="clean_sheet">🧤 零失球 (+4分)</option>
                    <option value="save">🥅 扑救 (+1分)</option>
                    <option value="yellow_card">🟨 黄牌 (-1分)</option>
                    <option value="red_card">🟥 红牌 (-3分)</option>
                    <option value="penalty_miss">❌ 点球失误 (-2分)</option>
                    <option value="own_goal">😱 乌龙球 (-2分)</option>
                    <option value="bonus">⭐ 奖励分 (+1分)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">分钟</label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={eventForm.minute}
                      onChange={(e) => setEventForm(prev => ({ ...prev, minute: parseInt(e.target.value) }))}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">积分</label>
                    <input
                      type="number"
                      value={eventForm.points}
                      onChange={(e) => setEventForm(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? '添加中...' : '添加事件'}
                </Button>
              </form>
            ) : (
              <div className="text-center py-8 text-gray-500">
                请先选择一场比赛
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}