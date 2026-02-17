'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface SyncStatus {
  totalPlayers: number;
  lastUpdated: string;
  syncAvailable: boolean;
  totalFixtures?: number;
  currentGameweekFixtures?: number;
  recommendations?: {
    needsPlayerSync: boolean;
    needsFixtureSync: boolean;
  };
}

const ADMIN_USER_IDS = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || '').split(',').filter(Boolean);

export default function AdminPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [fixtureManagement, setFixtureManagement] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      fetchSyncStatus();
      fetchSystemStatus();
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

  if (loading) {
    return (
      <Layout title="数据管理">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-2xl">加载中...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  if (ADMIN_USER_IDS.length > 0 && !ADMIN_USER_IDS.includes(user.id)) {
    return (
      <Layout title="数据管理">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-2xl text-red-600">Access Denied</div>
          <p className="text-gray-600 mt-2">You do not have admin access.</p>
        </div>
      </Layout>
    );
  }

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/status');
      const result = await response.json();
      if (result.success) {
        setSyncStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/check-table-structure', {
        method: 'POST',
        headers
      });
      const result = await response.json();
      if (result.success) {
        setSystemStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  const triggerSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/sync/fpl', {
        method: 'POST',
        headers
      });
      const result = await response.json();
      setSyncResult(result);
      
      if (result.success) {
        fetchSyncStatus(); // Refresh status
      }
    } catch (error) {
      setSyncResult({
        success: false,
        error: 'Failed to sync data'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Fixture management functions
  const quickUpdateFixtures = async () => {
    setSyncing(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/quick-fixtures-update', {
        method: 'POST',
        headers
      });

      const result = await response.json();

      if (result.success) {
        alert(`快速更新完成！\n${result.data.message}`);
        fetchSyncStatus();
        fetchSystemStatus();
      } else {
        alert(`快速更新失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating fixtures:', error);
      alert(`更新时出错: ${error.message || '网络错误'}`);
    } finally {
      setSyncing(false);
    }
  };

  const simpleUpdateFixtures = async () => {
    setSyncing(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/simple-fixtures-update', {
        method: 'POST',
        headers
      });

      const result = await response.json();

      if (result.success) {
        alert(`简化更新完成！\n${result.data.message}`);
        fetchSyncStatus();
        fetchSystemStatus();
      } else {
        alert(`简化更新失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating fixtures:', error);
      alert(`更新时出错: ${error.message || '网络错误'}`);
    } finally {
      setSyncing(false);
    }
  };

  const debugFixturesUpdate = async () => {
    setSyncing(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/debug-fixtures-update', {
        method: 'POST',
        headers
      });

      const result = await response.json();

      if (result.success) {
        const debug = result.debug;
        const message = `调试信息：\n` +
          `• FPL总比赛: ${debug.totalFplFixtures}\n` +
          `• FPL已完成: ${debug.finishedFplFixtures}\n` +
          `• 数据库队伍: ${debug.dbTeamsCount}\n` +
          `• 数据库比赛: ${debug.dbFixturesCount}\n` +
          `• 样本分析: 找到${debug.sampleAnalysis.foundMatches}/${debug.sampleAnalysis.analyzed}场匹配\n` +
          `• 需要更新: ${debug.sampleAnalysis.needUpdate}场\n` +
          `• 跳过: ${debug.sampleAnalysis.skipped}场`;
        alert(message);
        console.log('详细调试信息:', result.debug);
      } else {
        alert(`调试失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Error debugging fixtures:', error);
      alert(`调试时出错: ${error.message || '网络错误'}`);
    } finally {
      setSyncing(false);
    }
  };

  const fullSyncFPLData = async () => {
    if (!confirm('全量同步将处理所有689个球员和完整赛程数据，可能需要3-5分钟。\n\n是否继续？')) {
      return;
    }

    setSyncing(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

      const headers = await getAuthHeaders();
      const response = await fetch('/api/sync/full', {
        method: 'POST',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        const message = `全量同步完成！\n` +
          `• 更新球员: ${result.data.playersUpdated}\n` +
          `• 新增球员: ${result.data.newPlayers}\n` +
          `• 更新球队: ${result.data.teamsUpdated}\n` +
          `• 同步赛程: ${result.data.fixturesSynced}\n` +
          `• 当前游戏周: ${result.data.currentGameweek}` +
          (result.data.errors.length > 0 ? `\n\n⚠️ ${result.data.errors.length} 个错误` : '');
        alert(message);
        fetchSyncStatus();
        fetchSystemStatus();
      } else {
        alert(`全量同步失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Error with full sync:', error);
      if (error.name === 'AbortError') {
        alert('全量同步超时。数据可能已部分同步，请检查状态。');
      } else {
        alert(`全量同步时出错: ${error.message || '网络错误'}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  const fixTeamMappingAndSync = async () => {
    setSyncing(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/sync/teams', {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        const message = `团队映射修复完成！\n` +
          `• 修复团队映射: ${result.data.teamsFixed}\n` +
          `• 同步赛程: ${result.data.fixturesSynced}\n` +
          (result.data.errors.length > 0 ? `\n⚠️ ${result.data.errors.length} 个问题:\n${result.data.errors.slice(0,3).join('\n')}` : '');
        alert(message);
        fetchSyncStatus();
        fetchSystemStatus();
      } else {
        alert(`修复失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Error fixing team mapping:', error);
      alert(`修复时出错: ${error.message || '网络错误'}`);
    } finally {
      setSyncing(false);
    }
  };

  const cleanupOldData = async () => {
    if (!confirm('这将清理旧赛季和测试数据，包括过期的球员信息。\n\n确定继续吗？')) {
      return;
    }

    setSyncing(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'cleanup_old_players' })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        const message = `数据清理完成！\n` +
          `• 删除旧数据: ${result.data.deleted} 条\n` +
          `• 保留有效数据: ${result.data.kept} 条\n` +
          (result.data.errors.length > 0 ? `\n⚠️ ${result.data.errors.length} 个问题` : '');
        alert(message);
        fetchSyncStatus();
        fetchSystemStatus();
      } else {
        alert(`清理失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Error cleaning data:', error);
      alert(`清理时出错: ${error.message || '网络错误'}`);
    } finally {
      setSyncing(false);
    }
  };

  const cleanupDuplicates = async () => {
    if (!confirm('这将清理重复的球员数据（如Rico Lewis的多个版本）。\n\n将保留最新更新的版本，删除较旧的版本。\n\n确定继续吗？')) {
      return;
    }

    setSyncing(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'cleanup_duplicate_players' })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        const message = `重复数据清理完成！\n` +
          `• 删除重复: ${result.data.deleted} 条\n` +
          `• 保留唯一: ${result.data.kept} 条\n` +
          (result.data.errors.length > 0 ? `\n⚠️ ${result.data.errors.length} 个问题` : '');
        alert(message);
        fetchSyncStatus();
        fetchSystemStatus();
      } else {
        alert(`清理失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      alert(`清理时出错: ${error.message || '网络错误'}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Layout title="数据管理">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">系统管理中心</h1>
            <p className="text-gray-600">管理Fantasy Premier League数据同步、赛程更新和系统监控</p>
          </div>

          {/* 系统状态监控 */}
          {systemStatus && (
            <Card className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">系统状态监控</h2>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {systemStatus.teams.count}
                  </div>
                  <div className="text-sm text-gray-600">球队总数</div>
                  {systemStatus.teams.error && (
                    <div className="text-xs text-red-600 mt-1">错误: {systemStatus.teams.error}</div>
                  )}
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {systemStatus.players.count}
                  </div>
                  <div className="text-sm text-gray-600">球员总数</div>
                  {systemStatus.players.error && (
                    <div className="text-xs text-red-600 mt-1">错误: {systemStatus.players.error}</div>
                  )}
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {systemStatus.fixtures.count}
                  </div>
                  <div className="text-sm text-gray-600">比赛总数</div>
                  {systemStatus.fixtures.error && (
                    <div className="text-xs text-red-600 mt-1">错误: {systemStatus.fixtures.error}</div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={fetchSystemStatus} disabled={syncing}>
                  刷新状态
                </Button>
              </div>
            </Card>
          )}

          {/* 赛程管理区域 */}
          <Card className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">赛程管理</h2>
            <div className="mb-6">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-lg font-semibold text-orange-800">赛程状态</div>
                  <div className="text-sm text-gray-600 mt-1">
                    总赛程: {syncStatus?.totalFixtures || 0} 场
                  </div>
                  <div className="text-sm text-gray-600">
                    本轮: {syncStatus?.currentGameweekFixtures || 0} 场
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-lg font-semibold text-red-800">同步建议</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {syncStatus?.recommendations?.needsFixtureSync ? '⚠️ 建议同步赛程数据' : '✅ 赛程数据正常'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {syncStatus?.recommendations?.needsPlayerSync ? '⚠️ 建议同步球员数据' : '✅ 球员数据正常'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <Button onClick={simpleUpdateFixtures} disabled={syncing} className="bg-blue-600 hover:bg-blue-700">
                  {syncing ? '更新中...' : '简化更新赛程'}
                </Button>
                <Button onClick={quickUpdateFixtures} disabled={syncing} className="bg-green-600 hover:bg-green-700">
                  {syncing ? '更新中...' : '快速更新赛程'}
                </Button>
                <Button onClick={debugFixturesUpdate} disabled={syncing} className="bg-purple-600 hover:bg-purple-700">
                  {syncing ? '调试中...' : '调试赛程更新'}
                </Button>
              </div>

              {syncStatus?.recommendations?.needsFixtureSync && (
                <div className="flex gap-3">
                  <Button onClick={fixTeamMappingAndSync} disabled={syncing} className="bg-orange-600 hover:bg-orange-700">
                    {syncing ? '修复中...' : '修复团队映射'}
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">结算管理:</p>
                <a href="/admin/settlement" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="bg-purple-600 text-white hover:bg-purple-700">
                    打开结算管理页面
                  </Button>
                </a>
              </div>
            </div>
          </Card>

          {/* FPL数据同步卡片 */}
          <Card className="mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">球员数据同步</h2>
                <p className="text-gray-600">从官方Fantasy Premier League API同步最新球员数据</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {syncStatus?.totalPlayers || 0}
                </div>
                <div className="text-sm text-gray-500">球员总数</div>
              </div>
            </div>

            {syncStatus && (
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-semibold text-gray-800">
                    {syncStatus.totalPlayers}
                  </div>
                  <div className="text-sm text-gray-600">数据库中球员数</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-semibold text-gray-800">
                    {syncStatus.lastUpdated 
                      ? new Date(syncStatus.lastUpdated).toLocaleString('zh-CN')
                      : '未知'
                    }
                  </div>
                  <div className="text-sm text-gray-600">上次更新时间</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className={`text-lg font-semibold ${
                    syncStatus.syncAvailable ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {syncStatus.syncAvailable ? '可用' : '不可用'}
                  </div>
                  <div className="text-sm text-gray-600">同步状态</div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <Button
                onClick={triggerSync}
                disabled={syncing || !syncStatus?.syncAvailable}
              >
                {syncing ? '同步中...' : '快速同步'}
              </Button>
              <Button onClick={fullSyncFPLData} disabled={syncing} variant="outline">
                {syncing ? '全量同步中...' : '全量同步'}
              </Button>
              <Button variant="outline" onClick={fetchSyncStatus}>
                刷新状态
              </Button>
            </div>

            {/* 同步结果 */}
            {syncResult && (
              <div className={`mt-6 p-4 rounded-lg ${
                syncResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className={`font-semibold ${
                  syncResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {syncResult.success ? '同步成功！' : '同步失败'}
                </div>
                {syncResult.success && syncResult.data && (
                  <div className="mt-2 text-sm text-green-700">
                    <div>更新球员: {syncResult.data.playersUpdated}</div>
                    <div>新增球员: {syncResult.data.newPlayers}</div>
                    <div>FPL总球员: {syncResult.data.totalFplPlayers}</div>
                    <div>当前轮次: GW{syncResult.data.currentGameweek}</div>
                  </div>
                )}
                {syncResult.error && (
                  <div className="mt-2 text-sm text-red-700">
                    错误: {syncResult.error}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 高级管理功能 */}
          <Card className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">高级管理功能</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center mb-2">
                <div className="text-yellow-600 mr-2">⚠️</div>
                <div className="font-semibold text-yellow-800">注意事项</div>
              </div>
              <div className="text-sm text-yellow-700">
                以下功能可能影响系统数据，请谨慎操作。建议在非高峰时段执行。
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">数据清理</h4>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={cleanupDuplicates} disabled={syncing} variant="outline" className="text-orange-600 border-orange-600 hover:bg-orange-50">
                    {syncing ? '清理中...' : '清理重复数据'}
                  </Button>
                  <Button onClick={cleanupOldData} disabled={syncing} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                    {syncing ? '清理中...' : '清理过期数据'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* 数据说明 */}
          <Card>
            <h3 className="text-xl font-bold text-gray-800 mb-4">系统说明</h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">数据同步</h4>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <strong>数据来源：</strong>官方Fantasy Premier League API
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <strong>更新内容：</strong>球员价格、积分、进球、助攻等实时数据
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <strong>建议频率：</strong>每日同步一次
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">赛程管理</h4>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <strong>简化更新：</strong>适用于日常赛程同步
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <strong>团队映射：</strong>修复队伍名称映射问题
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <strong>调试模式：</strong>查看详细同步信息
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}