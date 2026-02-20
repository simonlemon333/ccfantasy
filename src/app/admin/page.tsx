'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface SystemStatus {
  teams: number;
  players: number;
  fixtures: number;
  finishedFixtures: number;
  currentGameweek: number | null;
  lastPlayerUpdate: string | null;
}

const ADMIN_USER_IDS = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || '').split(',').filter(Boolean);

export default function AdminPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading2, setLoading2] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      refreshStatus();
    }
  }, [user, loading]);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  const refreshStatus = async () => {
    setLoading2(true);
    try {
      const [teamsRes, playersRes, fixturesRes, finishedRes, playerUpdateRes] = await Promise.all([
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('players').select('*', { count: 'exact', head: true }),
        supabase.from('fixtures').select('*', { count: 'exact', head: true }),
        supabase.from('fixtures').select('*', { count: 'exact', head: true }).eq('finished', true),
        supabase.from('players').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
      ]);

      // Get current gameweek from fixtures
      const { data: gwData } = await supabase
        .from('fixtures')
        .select('gameweek')
        .eq('finished', false)
        .order('gameweek', { ascending: true })
        .limit(1)
        .single();

      setStatus({
        teams: teamsRes.count || 0,
        players: playersRes.count || 0,
        fixtures: fixturesRes.count || 0,
        finishedFixtures: finishedRes.count || 0,
        currentGameweek: gwData?.gameweek || null,
        lastPlayerUpdate: playerUpdateRes.data?.updated_at || null,
      });
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading2(false);
    }
  };

  const showResult = (success: boolean, message: string) => {
    setResult({ success, message });
    setTimeout(() => setResult(null), 8000);
  };

  // 一键同步所有数据
  const syncAll = async () => {
    setSyncing('all');
    setResult(null);
    try {
      const headers = await getAuthHeaders();

      // Step 1: Sync players
      const playerRes = await fetch('/api/sync/fpl', { method: 'POST', headers });
      const playerResult = await playerRes.json();
      if (!playerResult.success) throw new Error(`球员同步失败: ${playerResult.error}`);

      // Step 2: Sync all fixtures
      const fixtureRes = await fetch('/api/admin/simple-fixtures-update', { method: 'POST', headers });
      const fixtureResult = await fixtureRes.json();
      if (!fixtureResult.success) throw new Error(`赛程同步失败: ${fixtureResult.error}`);

      showResult(true,
        `同步完成!\n` +
        `球员: ${playerResult.data.newPlayers} 新增, ${playerResult.data.playersUpdated} 更新\n` +
        `赛程: ${fixtureResult.data.insertedFixtures} 新增, ${fixtureResult.data.updatedFixtures} 更新\n` +
        `当前轮次: GW${playerResult.data.currentGameweek}`
      );
      refreshStatus();
    } catch (error) {
      showResult(false, error instanceof Error ? error.message : '同步失败');
    } finally {
      setSyncing(null);
    }
  };

  // 只同步球员
  const syncPlayers = async () => {
    setSyncing('players');
    setResult(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/sync/fpl', { method: 'POST', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showResult(true, `球员同步完成: ${data.data.newPlayers} 新增, ${data.data.playersUpdated} 更新, 当前GW${data.data.currentGameweek}`);
      refreshStatus();
    } catch (error) {
      showResult(false, error instanceof Error ? error.message : '球员同步失败');
    } finally {
      setSyncing(null);
    }
  };

  // 只同步赛程
  const syncFixtures = async () => {
    setSyncing('fixtures');
    setResult(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/simple-fixtures-update', { method: 'POST', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showResult(true, `赛程同步完成: ${data.data.insertedFixtures} 新增, ${data.data.updatedFixtures} 更新`);
      refreshStatus();
    } catch (error) {
      showResult(false, error instanceof Error ? error.message : '赛程同步失败');
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <Layout title="系统管理">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-xl text-gray-500">加载中...</div>
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  if (ADMIN_USER_IDS.length > 0 && !ADMIN_USER_IDS.includes(user.id)) {
    return (
      <Layout title="系统管理">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-2xl text-red-600">无权限访问</div>
          <p className="text-gray-600 mt-2">你不是管理员。</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="系统管理">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">

          <h1 className="text-2xl font-bold text-gray-800 mb-6">系统管理</h1>

          {/* 数据状态 */}
          <Card className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{status?.teams ?? '-'}</div>
                <div className="text-xs text-gray-500">球队</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{status?.players ?? '-'}</div>
                <div className="text-xs text-gray-500">球员</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{status?.fixtures ?? '-'}</div>
                <div className="text-xs text-gray-500">赛程</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">GW{status?.currentGameweek ?? '-'}</div>
                <div className="text-xs text-gray-500">当前轮次</div>
              </div>
            </div>
            {status?.lastPlayerUpdate && (
              <div className="text-xs text-gray-400 text-center">
                上次更新: {new Date(status.lastPlayerUpdate).toLocaleString('zh-CN')}
              </div>
            )}
          </Card>

          {/* 操作按钮 */}
          <Card className="mb-6">
            <div className="space-y-3">
              <Button
                onClick={syncAll}
                disabled={!!syncing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                {syncing === 'all' ? '同步中...' : '一键同步所有数据'}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={syncPlayers}
                  disabled={!!syncing}
                  variant="outline"
                >
                  {syncing === 'players' ? '同步中...' : '只同步球员'}
                </Button>
                <Button
                  onClick={syncFixtures}
                  disabled={!!syncing}
                  variant="outline"
                >
                  {syncing === 'fixtures' ? '同步中...' : '只同步赛程'}
                </Button>
              </div>
            </div>
          </Card>

          {/* 结算入口 */}
          <Card className="mb-6">
            <a href="/admin/settlement">
              <Button variant="outline" className="w-full">
                结算管理
              </Button>
            </a>
          </Card>

          {/* 操作结果 */}
          {result && (
            <div className={`p-4 rounded-lg whitespace-pre-line ${
              result.success
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {result.message}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
