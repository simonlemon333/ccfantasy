'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface SyncStatus {
  totalPlayers: number;
  lastUpdated: string;
  syncAvailable: boolean;
}

export default function AdminPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/fpl');
      const result = await response.json();
      if (result.success) {
        setSyncStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  const triggerSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      const response = await fetch('/api/sync/fpl', {
        method: 'POST'
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

  return (
    <Layout title="数据管理">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">数据管理中心</h1>
            <p className="text-gray-600">管理Fantasy Premier League数据同步</p>
          </div>

          {/* FPL数据同步卡片 */}
          <Card className="mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">FPL数据同步</h2>
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

            <div className="flex items-center gap-4">
              <Button 
                onClick={triggerSync} 
                disabled={syncing || !syncStatus?.syncAvailable}
              >
                {syncing ? '同步中...' : '开始同步FPL数据'}
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

          {/* 数据说明 */}
          <Card>
            <h3 className="text-xl font-bold text-gray-800 mb-4">数据同步说明</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <strong>数据来源：</strong>官方Fantasy Premier League API (fantasy.premierleague.com)
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <strong>更新内容：</strong>球员价格、积分、进球、助攻、状态等实时数据
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <strong>球员照片：</strong>自动从Premier League官方资源获取高清球员照片
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <strong>建议频率：</strong>每日同步一次，确保数据实时性
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}