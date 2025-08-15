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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (!user) {
        setLoading(false);
        return;
      }

      // Prefer server lineup, fallback to local draft
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
          console.log('Processing lineups:', result.data.length);
          const mapped = result.data.map((latestLineup: any) => {
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
              isDraft: !latestLineup.is_submitted
            } as LineupData;
          });

          setLineups(mapped);
          console.log('Mapped lineups:', mapped);
          setLoading(false);
          return;
        } else {
          console.log('No lineups found or API failed:', result);
        }
      } catch (err) {
        console.error('Failed to fetch server lineup:', err);
      }

  // Do not fallback to localStorage automatically; server is canonical. If needed, users can import drafts manually.
  setLoading(false);
    };

    load();
  }, [user]);

  const calculateTeamStats = (ld?: LineupData | null) => {
    const lineup = ld || (lineups.length > 0 ? lineups[0] : null);
    if (!lineup) return { totalCost: 0, playerCount: 0, starterCount: 0, totalPoints: 0 };
    const totalCost = lineup.players.reduce((sum, p) => sum + (p.price || 0), 0);
    const playerCount = lineup.players.length;
    const starterCount = lineup.players.filter(p => p.is_starter).length;
    const totalPoints = lineup.players.reduce((sum, p) => sum + (p.total_points || 0), 0);
    return { totalCost, playerCount, starterCount, totalPoints };
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

  const selectedLineup = lineups.length > 0 ? lineups[0] : null;
  const stats = calculateTeamStats(selectedLineup);

  return (
    <Layout title="我的球队">
      <div className="container mx-auto px-6 py-12">
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
              </div>
            </Card>

            <Card>
              <div className="mb-3">
                <a href="/my-team/squad" className="block w-full text-center p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">编辑阵容</a>
              </div>
            </Card>

            <Card>
              <h4 className="text-xl font-bold text-gray-800 mb-4">我的保存阵容</h4>
              <div className="space-y-3">
                {lineups.length === 0 && (
                  <div className="text-sm text-gray-500">你还没有保存任何阵容。</div>
                )}
                {lineups.map(l => (
                  <div key={l.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-semibold">阵型：{l.formation} {l.isDraft ? <span className="text-yellow-600 text-sm">(草稿)</span> : null}</div>
                      <div className="text-xs text-gray-500">保存：{l.lastSaved}</div>
                    </div>
                    <div className="flex space-x-2">
                      <a href={`/my-team/squad?loadLineup=${l.id}`} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">加载到编辑器</a>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}