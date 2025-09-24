'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import PlayerBadge from '../../components/PlayerBadge';
import EmptySlot from '../../components/EmptySlot';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
  total_points?: number;
  photo_url?: string | null;
  teams: {
    name: string;
    short_name?: string;
    primary_color?: string;
  };
}

interface SquadPlayer extends Player {
  is_starter: boolean;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface LineupData {
  id?: string;
  players: SquadPlayer[];
  formation: string;
  lastSaved: string;
  isDraft: boolean;
  totalPoints?: number;
  gameweekPoints?: number;
}

interface JoinedRoom {
  id: string;
  room_code: string;
  name: string;
  description: string;
  gameweek: number;
  is_active: boolean;
  joined_at: string;
}

interface Fixture {
  id: string;
  gameweek: number;
  kickoff_time: string;
  home_team: {
    name: string;
    short_name: string;
  };
  away_team: {
    name: string;
    short_name: string;
  };
}

const FORMATIONS = [
  { name: '4-4-2', def: 4, mid: 4, fwd: 2 },
  { name: '4-3-3', def: 4, mid: 3, fwd: 3 },
  { name: '3-5-2', def: 3, mid: 5, fwd: 2 },
  { name: '5-3-2', def: 5, mid: 3, fwd: 2 },
  { name: '3-4-3', def: 3, mid: 4, fwd: 3 },
  { name: '4-5-1', def: 4, mid: 5, fwd: 1 },
  { name: '5-4-1', def: 5, mid: 4, fwd: 1 }
];

export default function MyTeamPage() {
  const { user } = useAuth();
  const [lineups, setLineups] = useState<LineupData[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<JoinedRoom[]>([]);
  const [selectedLineupData, setSelectedLineupData] = useState<LineupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [localDraft, setLocalDraft] = useState<LineupData | null>(null);
  const [currentGameweek, setCurrentGameweek] = useState(1);
  const [upcomingMatches, setUpcomingMatches] = useState<Fixture[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (!user) {
        setLoading(false);
        return;
      }

      // Load local draft, lineups and joined rooms
      await Promise.all([
        loadLocalDraft(),
        fetchLineups(),
        fetchJoinedRooms(),
        fetchCurrentGameweek()
      ]);
      
      setLoading(false);
    };

    load();
  }, [user]);

  const loadLocalDraft = async () => {
    if (!user) return;
    
    try {
      const data = localStorage.getItem(`lineup_draft_${user.id}`);
      if (data) {
        const draft = JSON.parse(data);
        console.log('Loaded local draft:', draft);
        setLocalDraft({
          id: undefined, // Local drafts don't have server IDs
          players: draft.players || [],
          formation: draft.formation || '4-4-2',
          lastSaved: new Date(draft.lastSaved || Date.now()).toLocaleString(),
          isDraft: true
        });
      }
    } catch (error) {
      console.error('Failed to load local draft:', error);
    }
  };

  const fetchJoinedRooms = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch('/api/rooms/joined', { headers });
      const result = await response.json();

      if (result.success) {
        setJoinedRooms(result.data || []);
      } else {
        console.error('Failed to fetch joined rooms:', result.error);
      }
    } catch (error) {
      console.error('Error fetching joined rooms:', error);
    }
  };

  const fetchCurrentGameweek = async () => {
    try {
      const response = await fetch('/api/fixtures?limit=10');
      const result = await response.json();
      if (result.success) {
        const fixtures = result.data || [];
        if (fixtures.length > 0) {
          const currentGW = fixtures[0].gameweek || 1;
          setCurrentGameweek(currentGW);
          setUpcomingMatches(fixtures.slice(0, 5)); // Show next 5 matches
        }
      }
    } catch (error) {
      console.error('Error fetching current gameweek:', error);
    }
  };

  const fetchLineups = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching lineups for user:', user.id);
      
      // Get access token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || null;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
        
      const response = await fetch(`/api/lineups?userId=${user.id}`, {
        method: 'GET',
        headers
      });
      
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('API response:', result);
      console.log('API response data length:', result.data ? result.data.length : 'null/undefined');
      console.log('API response data:', result.data);

      if (result.success && result.data && result.data.length > 0) {
        console.log('Processing lineups from API:', result.data.length);
        console.log('Raw API data:', result.data);
        const mapped = result.data.map((latestLineup: any) => {
          console.log('Processing lineup:', latestLineup.id, latestLineup);
          const squadPlayers: SquadPlayer[] = latestLineup.lineup_players.map((lp: any) => ({
            id: lp.players.id,
            name: lp.players.name,
            position: lp.players.position,
            price: lp.players.price,
            total_points: lp.players.total_points,
            photo_url: lp.players.photo_url,
            teams: {
              name: lp.players.teams.name,
              short_name: lp.players.teams.short_name,
              primary_color: lp.players.teams.primary_color || '#000000'
            },
            is_starter: lp.is_starter,
            is_captain: lp.is_captain,
            is_vice_captain: lp.is_vice_captain
          }));

          return {
            id: latestLineup.id,
            players: squadPlayers,
            formation: latestLineup.formation || '4-4-2',
            lastSaved: new Date(latestLineup.updated_at || latestLineup.created_at).toLocaleString(),
            isDraft: !latestLineup.is_submitted,
            totalPoints: latestLineup.total_points || 0,
            gameweekPoints: latestLineup.gameweek_points || 0
          } as LineupData;
        });

        setLineups(mapped);
        console.log('Mapped lineups:', mapped);
        console.log('Lineup IDs:', mapped.map((l: LineupData) => ({ id: l.id, formation: l.formation, isDraft: l.isDraft })));
      } else {
        console.log('No lineups found or API failed:', result);
      }
    } catch (err) {
      console.error('Failed to fetch server lineup:', err);
    }
  };



  const calculateTeamStats = (ld?: LineupData | null) => {
    const lineup = ld || localDraft || (lineups.length > 0 ? lineups[0] : null);
    if (!lineup) return { totalCost: 0, playerCount: 0, starterCount: 0, totalPoints: 0, gameweekPoints: 0 };
    const totalCost = lineup.players.reduce((sum, p) => sum + (p.price || 0), 0);
    const playerCount = lineup.players.length;
    const starterCount = lineup.players.filter(p => p.is_starter).length;
    const totalPoints = lineup.players.reduce((sum, p) => sum + (p.total_points || 0), 0);
    
    // Get gameweek points from lineup_players if available
    let gameweekPoints = 0;
    if (lineup.id && lineups.length > 0) {
      // For saved lineups, we should get this from the lineup object itself
      const savedLineup = lineups.find(l => l.id === lineup.id);
      gameweekPoints = savedLineup?.gameweekPoints || 0;
    }
    
    return { totalCost, playerCount, starterCount, totalPoints, gameweekPoints };
  };

  if (loading) {
    return (
      <Layout title="我的球队">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-2xl">加载球队数据中...</div>
        </div>
      </Layout>
    );
  }

  const selectedLineup = localDraft || (lineups.length > 0 ? lineups[0] : null);
  const stats = calculateTeamStats(selectedLineup);

  return (
    <Layout title="我的球队">
      <div className="container mx-auto px-6 py-12">
        {/* 游戏周状态卡片 */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl font-bold text-blue-700">第 {currentGameweek} 轮</div>
                <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {joinedRooms.length > 0 ? `已加入 ${joinedRooms.length} 个联赛` : '未加入联赛'}
                </div>
              </div>

              {upcomingMatches.length > 0 && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">即将进行的比赛:</div>
                  <div className="space-y-1">
                    {upcomingMatches.slice(0, 3).map((fixture) => (
                      <div key={fixture.id} className="text-sm">
                        <span className="font-medium">{fixture.home_team.short_name}</span>
                        <span className="mx-2 text-gray-500">vs</span>
                        <span className="font-medium">{fixture.away_team.short_name}</span>
                        <span className="ml-3 text-gray-500">
                          {new Date(fixture.kickoff_time).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    ))}
                    {upcomingMatches.length > 3 && (
                      <div className="text-xs text-gray-500">还有 {upcomingMatches.length - 3} 场比赛...</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {joinedRooms.length === 0 ? (
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">开始你的梦幻足球之旅</div>
                  <div className="flex gap-2">
                    <a
                      href="/leagues"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      创建/加入联赛
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">查看你的表现</div>
                  <div className="flex gap-2">
                    <a
                      href="/leaderboard"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      查看排行榜
                    </a>
                    <a
                      href="/leagues"
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium"
                    >
                      管理联赛
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card>
              <h3 className="text-2xl font-bold text-gray-800 mb-6">我的阵容</h3>

              <div className="bg-white rounded-lg p-6 min-h-96 relative">
                {!selectedLineup && (
                  <div className="text-center text-gray-600">
                    <div className="text-6xl mb-4">⚽</div>
                    <p className="text-lg">球队阵容即将开放</p>
                    <p className="text-sm">敬请期待选择你的梦幻阵容</p>
                  </div>
                )}

                {selectedLineup && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">阵型：{selectedLineup.formation} {selectedLineup.isDraft ? <span className="ml-2 text-sm text-yellow-700">（草稿）</span> : null}</h3>
                        <div className="text-sm text-gray-500">最后保存：{selectedLineup.lastSaved}</div>
                      </div>
                      <div className="text-sm text-gray-600">球员：{stats.playerCount} · 首发：{stats.starterCount}</div>
                    </div>

                    {/* field layout read-only */}
                    <div className="bg-gradient-to-t from-green-400 to-green-300 rounded-lg p-8 min-h-[420px] relative overflow-hidden">
                      <div className="relative h-full flex flex-col justify-evenly py-8 space-y-8">
                        {/* GK */}
                        <div className="flex justify-center">
                          {selectedLineup.players.filter(p => p.is_starter && p.position === 'GK').slice(0,1).map(p => (
                            <PlayerBadge key={p.id} player={p} />
                          ))}
                          {selectedLineup.players.filter(p => p.is_starter && p.position === 'GK').length === 0 && (
                            <EmptySlot position="GK" onClick={() => {}} />
                          )}
                        </div>

                        {/* DEF */}
                        <div className="flex justify-center space-x-8">
                          {Array.from({ length: parseInt((selectedLineup.formation || '4-4-2').split('-')[0], 10) }, (_, i) => {
                            const defPlayers = selectedLineup.players.filter(p => p.is_starter && p.position === 'DEF') || [];
                            const player = defPlayers[i];
                            return player ? <PlayerBadge key={player.id} player={player} /> : <EmptySlot key={i} position="DEF" onClick={() => {}} />;
                          })}
                        </div>

                        {/* MID */}
                        <div className="flex justify-center space-x-8">
                          {Array.from({ length: parseInt((selectedLineup.formation || '4-4-2').split('-')[1], 10) }, (_, i) => {
                            const midPlayers = selectedLineup.players.filter(p => p.is_starter && p.position === 'MID') || [];
                            const player = midPlayers[i];
                            return player ? <PlayerBadge key={player.id} player={player} /> : <EmptySlot key={i} position="MID" onClick={() => {}} />;
                          })}
                        </div>

                        {/* FWD */}
                        <div className="flex justify-center space-x-8">
                          {Array.from({ length: parseInt((selectedLineup.formation || '4-4-2').split('-')[2], 10) }, (_, i) => {
                            const fwdPlayers = selectedLineup.players.filter(p => p.is_starter && p.position === 'FWD') || [];
                            const player = fwdPlayers[i];
                            return player ? <PlayerBadge key={player.id} player={player} /> : <EmptySlot key={i} position="FWD" onClick={() => {}} />;
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <h4 className="text-xl font-bold text-gray-800 mb-4">球队统计</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">已用金额</span>
                  <span className="font-semibold">£{stats.totalCost.toFixed(1)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">球员数量</span>
                  <span className="font-semibold">{stats.playerCount}/15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">首发数量</span>
                  <span className="font-semibold">{stats.starterCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总积分</span>
                  <span className="font-semibold">{stats.totalPoints}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">本轮积分</span>
                  <span className="font-semibold text-green-600">{stats.gameweekPoints}</span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="mb-3">
                <a href="/my-team/squad" className="block w-full text-center p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">编辑阵容</a>
              </div>
            </Card>

            <Card>
              <h4 className="text-xl font-bold text-gray-800 mb-4">我的阵容管理</h4>
              
              {/* 本地草稿 */}
              {localDraft && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-semibold text-blue-800 mb-2">📝 本地草稿</h5>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">阵型：{localDraft.formation}</div>
                      <div className="text-xs text-gray-500">最后保存：{localDraft.lastSaved}</div>
                      <div className="text-xs text-blue-600">💡 在编辑页面可直接保存并提交到联赛</div>
                    </div>
                    <div>
                      <a href="/my-team/squad" className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">继续编辑</a>
                    </div>
                  </div>
                </div>
              )}

              {/* 服务器阵容 */}
              <div className="space-y-3">
                <h5 className="font-semibold text-gray-700">🔒 已锁定阵容</h5>
                {lineups.length === 0 && !localDraft && (
                  <div className="text-sm text-gray-500">你还没有保存任何阵容。</div>
                )}
                {lineups.length === 0 && localDraft && (
                  <div className="text-sm text-gray-500">锁定草稿后将显示在这里。</div>
                )}
                {lineups.map(l => (
                  <div key={l.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div>
                      <div className="font-semibold">
                        阵型：{l.formation} 
                        {l.isDraft ? (
                          <span className="text-orange-600 text-sm"> (草稿 - 可提交)</span>
                        ) : (
                          <span className="text-green-600 text-sm"> (已提交到联赛)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">保存：{l.lastSaved}</div>
                      {l.id && <div className="text-xs text-gray-400">ID: {l.id.slice(0, 8)}...</div>}
                      {!l.isDraft && (
                        <div className="text-xs text-green-600 font-medium">✓ 已在联赛积分榜显示</div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <a href={`/my-team/squad?loadLineup=${l.id}`} className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">编辑</a>
                      {!l.isDraft && (
                        <div className="px-3 py-1 rounded bg-green-100 text-green-700 text-sm">
                          已参赛
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 已加入的联赛 */}
            {joinedRooms.length > 0 && (
              <Card>
                <h4 className="text-xl font-bold text-gray-800 mb-4">我的联赛</h4>
                <div className="space-y-3">
                  {joinedRooms.map(room => (
                    <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-semibold">{room.name}</div>
                        <div className="text-sm text-gray-600">代码: {room.room_code} • 游戏周 {room.gameweek}</div>
                        <div className="text-xs text-gray-500">加入时间: {new Date(room.joined_at).toLocaleDateString('zh-CN')}</div>
                      </div>
                      <div className="flex space-x-2">
                        <a 
                          href={`/leagues/${room.id}`}
                          className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                        >
                          查看详情
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}