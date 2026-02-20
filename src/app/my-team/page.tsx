'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
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

export default function MyTeamPage() {
  const { user } = useAuth();
  const [lineups, setLineups] = useState<LineupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchLineups();
  }, [user]);

  const fetchLineups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const response = await fetch(`/api/lineups?userId=${user.id}`, { headers });
      const result = await response.json();

      if (result.success && result.data?.length > 0) {
        const mapped = result.data.map((lineup: any) => {
          const squadPlayers: SquadPlayer[] = lineup.lineup_players.map((lp: any) => ({
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
            id: lineup.id,
            players: squadPlayers,
            formation: lineup.formation || '4-4-2',
            lastSaved: new Date(lineup.updated_at || lineup.created_at).toLocaleString(),
            isDraft: !lineup.is_submitted,
            totalPoints: lineup.total_points || 0,
            gameweekPoints: lineup.gameweek_points || 0
          } as LineupData;
        });
        setLineups(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch lineups:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="我的阵容">
        <div className="container mx-auto px-6 py-12 text-center text-gray-500">加载中...</div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout title="我的阵容">
        <div className="container mx-auto px-6 py-12 text-center">
          <p className="text-gray-600 mb-4">请先登录查看你的阵容</p>
          <a href="/login"><Button>去登录</Button></a>
        </div>
      </Layout>
    );
  }

  const lineup = lineups[0] || null;

  // No lineup at all — direct to editor
  if (!lineup) {
    return (
      <Layout title="我的阵容">
        <div className="container mx-auto px-6 py-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-6">⚽</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">还没有阵容</h2>
            <p className="text-gray-600 mb-8">创建你的第一支梦幻球队，挑选15名球员组成阵容</p>
            <a href="/my-team/squad">
              <Button size="lg">创建阵容</Button>
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  // Has lineup — show it
  const stats = {
    totalCost: lineup.players.reduce((sum, p) => sum + (p.price || 0), 0),
    playerCount: lineup.players.length,
    starterCount: lineup.players.filter(p => p.is_starter).length,
    totalPoints: lineup.players.reduce((sum, p) => sum + (p.total_points || 0), 0),
    gameweekPoints: lineup.gameweekPoints || 0,
  };

  const formationParts = (lineup.formation || '4-4-2').split('-').map(Number);

  return (
    <Layout title="我的阵容">
      <div className="container mx-auto px-6 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Field view */}
          <div className="md:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    阵型: {lineup.formation}
                    {lineup.isDraft && <span className="ml-2 text-sm text-yellow-700">(草稿)</span>}
                    {!lineup.isDraft && <span className="ml-2 text-sm text-green-600">(已提交)</span>}
                  </h3>
                  <div className="text-xs text-gray-500">保存: {lineup.lastSaved}</div>
                </div>
                <a href={`/my-team/squad${lineup.id ? `?loadLineup=${lineup.id}` : ''}`}>
                  <Button size="sm">编辑阵容</Button>
                </a>
              </div>

              <div className="bg-gradient-to-t from-green-400 to-green-300 rounded-lg p-6 min-h-[400px] relative overflow-hidden">
                <div className="relative h-full flex flex-col justify-evenly py-6 space-y-6">
                  {/* GK */}
                  <div className="flex justify-center">
                    {lineup.players.filter(p => p.is_starter && p.position === 'GK').slice(0, 1).map(p => (
                      <PlayerBadge key={p.id} player={p} />
                    ))}
                    {lineup.players.filter(p => p.is_starter && p.position === 'GK').length === 0 && (
                      <EmptySlot position="GK" onClick={() => {}} />
                    )}
                  </div>
                  {/* DEF */}
                  <div className="flex justify-center space-x-6">
                    {Array.from({ length: formationParts[0] }, (_, i) => {
                      const defs = lineup.players.filter(p => p.is_starter && p.position === 'DEF');
                      const player = defs[i];
                      return player ? <PlayerBadge key={player.id} player={player} /> : <EmptySlot key={i} position="DEF" onClick={() => {}} />;
                    })}
                  </div>
                  {/* MID */}
                  <div className="flex justify-center space-x-6">
                    {Array.from({ length: formationParts[1] }, (_, i) => {
                      const mids = lineup.players.filter(p => p.is_starter && p.position === 'MID');
                      const player = mids[i];
                      return player ? <PlayerBadge key={player.id} player={player} /> : <EmptySlot key={i} position="MID" onClick={() => {}} />;
                    })}
                  </div>
                  {/* FWD */}
                  <div className="flex justify-center space-x-6">
                    {Array.from({ length: formationParts[2] }, (_, i) => {
                      const fwds = lineup.players.filter(p => p.is_starter && p.position === 'FWD');
                      const player = fwds[i];
                      return player ? <PlayerBadge key={player.id} player={player} /> : <EmptySlot key={i} position="FWD" onClick={() => {}} />;
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Stats sidebar */}
          <div className="space-y-6">
            <Card>
              <h4 className="font-bold text-gray-800 mb-3">球队统计</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">已用金额</span>
                  <span className="font-semibold">{stats.totalCost.toFixed(1)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">球员</span>
                  <span className="font-semibold">{stats.playerCount}/15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">首发</span>
                  <span className="font-semibold">{stats.starterCount}/11</span>
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

            {/* Other lineups if multiple exist */}
            {lineups.length > 1 && (
              <Card>
                <h4 className="font-bold text-gray-800 mb-3">其他阵容</h4>
                <div className="space-y-2">
                  {lineups.slice(1).map(l => (
                    <div key={l.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                      <div>
                        <div className="font-medium">{l.formation}</div>
                        <div className="text-xs text-gray-500">{l.lastSaved}</div>
                      </div>
                      <a href={`/my-team/squad?loadLineup=${l.id}`} className="text-blue-600 hover:underline text-xs">
                        编辑
                      </a>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <a href="/my-team/squad" className="block">
              <Button className="w-full">编辑阵容</Button>
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
