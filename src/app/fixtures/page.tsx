'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
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
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [settlementStatus, setSettlementStatus] = useState<any>(null);

  const { user } = useAuth();

  useEffect(() => {
    fetchFixtures();
    fetchSyncStatus();
    fetchSettlementStatus();
  }, [selectedGameweek]);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/status');
      const result = await response.json();
      if (result.success) {
        setSyncStatus(result.data);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  const fetchSettlementStatus = async () => {
    try {
      const response = await fetch(`/api/admin/settlement?gameweek=${selectedGameweek}`);
      const result = await response.json();
      if (result.success) {
        setSettlementStatus(result.data);
      }
    } catch (error) {
      console.error('Error fetching settlement status:', error);
    }
  };

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

  const syncFPLData = async () => {
    setSyncing(true);
    
    // Show progress message
    const progressAlert = () => {
      const message = '正在同步FPL数据...\n这可能需要1-2分钟，请耐心等待。';
      return message;
    };
    
    try {
      // Set a longer timeout for sync operation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout
      
      const response = await fetch('/api/sync/fpl', {
        method: 'POST',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const message = `数据同步成功！\n` +
          `• 更新球员: ${result.data.playersUpdated}\n` +
          `• 新增球员: ${result.data.newPlayers}\n` +
          `• 同步赛程: ${result.data.fixturesSynced || 0}\n` +
          `• 当前游戏周: ${result.data.currentGameweek}`;
        alert(message);
        fetchFixtures(); // Refresh fixtures
        fetchSyncStatus(); // Refresh sync status
      } else {
        alert(`同步失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Error syncing FPL data:', error);
      if (error.name === 'AbortError') {
        alert('同步超时，请稍后重试。如果问题持续，请尝试分批同步数据。');
      } else {
        alert(`同步时出错: ${error.message || '网络错误'}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  const quickUpdateFixtures = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/quick-fixtures-update', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        alert(`快速更新完成！\n${result.data.message}`);
        fetchFixtures(); // 刷新赛事数据
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
      const response = await fetch('/api/admin/simple-fixtures-update', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        alert(`简化更新完成！\n${result.data.message}`);
        fetchFixtures(); // 刷新赛事数据
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

  const checkTableStructure = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/check-table-structure', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        const data = result.data;
        const message = `表结构检查：\n\n` +
          `Teams: ${data.teams.count} 条记录\n` +
          `Players: ${data.players.count} 条记录\n` +
          `Fixtures: ${data.fixtures.count} 条记录\n\n` +
          `错误:\n` +
          `Teams: ${data.teams.error || '无'}\n` +
          `Players: ${data.players.error || '无'}\n` +
          `Fixtures: ${data.fixtures.error || '无'}`;
        alert(message);
        console.log('详细表结构:', result.data);
      } else {
        alert(`检查失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Error checking table structure:', error);
      alert(`检查时出错: ${error.message || '网络错误'}`);
    } finally {
      setSyncing(false);
    }
  };

  const debugFixturesUpdate = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/debug-fixtures-update', {
        method: 'POST'
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
      
      const response = await fetch('/api/sync/full', {
        method: 'POST',
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
        fetchFixtures();
        fetchSyncStatus();
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
      const response = await fetch('/api/sync/teams', {
        method: 'POST'
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
        fetchFixtures();
        fetchSyncStatus();
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
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleFixtureClick = async (fixture: Fixture) => {
    setSelectedFixture(fixture);
    if (fixture.finished) {
      await fetchFixtureEvents(fixture.id);
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
          <div className="flex items-center gap-4 mb-4 md:mb-0">
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
          
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <Button onClick={fetchFixtures} variant="outline" disabled={loading}>
                {loading ? '加载中...' : '刷新'}
              </Button>
              {user && (
                <div className="flex gap-2">
                  <Button onClick={checkTableStructure} disabled={syncing} className="bg-orange-600 hover:bg-orange-700">
                    {syncing ? '检查中...' : '检查表结构'}
                  </Button>
                  <Button onClick={simpleUpdateFixtures} disabled={syncing} className="bg-blue-600 hover:bg-blue-700">
                    {syncing ? '简化更新中...' : '新表结构更新'}
                  </Button>
                  <Button onClick={quickUpdateFixtures} disabled={syncing} className="bg-green-600 hover:bg-green-700">
                    {syncing ? '更新中...' : '旧快速刷新'}
                  </Button>
                  <Button onClick={debugFixturesUpdate} disabled={syncing} className="bg-purple-600 hover:bg-purple-700">
                    {syncing ? '调试中...' : '调试更新'}
                  </Button>
                  <Button onClick={syncFPLData} disabled={syncing}>
                    {syncing ? '同步中...' : '快速同步'}
                  </Button>
                  <Button onClick={fullSyncFPLData} disabled={syncing} variant="outline">
                    {syncing ? '全量同步中...' : '全量同步'}
                  </Button>
                  {syncStatus?.recommendations.needsFixtureSync && (
                    <Button onClick={fixTeamMappingAndSync} disabled={syncing} className="bg-orange-600 hover:bg-orange-700">
                      {syncing ? '修复中...' : '修复赛程'}
                    </Button>
                  )}
                  <Button onClick={cleanupOldData} disabled={syncing} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                    {syncing ? '清理中...' : '清理旧数据'}
                  </Button>
                  <Button onClick={cleanupDuplicates} disabled={syncing} variant="outline" className="text-orange-600 border-orange-600 hover:bg-orange-50">
                    {syncing ? '清理中...' : '清理重复'}
                  </Button>
                  {settlementStatus && (
                    <a href="/admin/settlement" target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="bg-purple-600 text-white hover:bg-purple-700">
                        结算管理
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
            
            {(syncStatus || settlementStatus) && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                {syncStatus && (
                  <div className="flex items-center gap-4 mb-2">
                    <span>球员: {syncStatus.totalPlayers}</span>
                    <span>赛程: {syncStatus.totalFixtures}</span>
                    <span>本轮: {syncStatus.currentGameweekFixtures}</span>
                    {syncStatus.lastUpdated && (
                      <span>更新: {new Date(syncStatus.lastUpdated).toLocaleDateString('zh-CN')}</span>
                    )}
                  </div>
                )}
                
                {settlementStatus && (
                  <div className="flex items-center gap-4 mb-2">
                    <span>结算状态: {settlementStatus.lineupsSettled}/{settlementStatus.totalLineups} 阵容</span>
                    <span>比赛: {settlementStatus.fixturesFinished}/{settlementStatus.totalFixtures} 已结束</span>
                    <span className={settlementStatus.canSettle ? 'text-green-600' : 'text-orange-600'}>
                      {settlementStatus.canSettle ? '✅ 可结算' : '⏳ 等待比赛'}
                    </span>
                  </div>
                )}

                {syncStatus?.recommendations.needsPlayerSync && (
                  <div className="text-orange-600 mt-1">⚠️ 建议同步球员数据</div>
                )}
                {syncStatus?.recommendations.needsFixtureSync && (
                  <div className="text-orange-600 mt-1">⚠️ 建议同步赛程数据</div>
                )}
                {settlementStatus?.allFixturesFinished && settlementStatus?.lineupsSettled < settlementStatus?.totalLineups && (
                  <div className="text-purple-600 mt-1">🎯 建议执行结算</div>
                )}
              </div>
            )}
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
              <p className="text-gray-600 mb-6">可以尝试同步最新的 FPL 数据</p>
              {user && (
                <Button onClick={syncFPLData} disabled={syncing}>
                  {syncing ? '同步中...' : '同步比赛数据'}
                </Button>
              )}
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