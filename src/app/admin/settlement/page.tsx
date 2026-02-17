'use client';

import { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface SettlementStatus {
  gameweek: number;
  fixturesFinished: number;
  totalFixtures: number;
  lineupsSettled: number;
  totalLineups: number;
  canSettle: boolean;
  allFixturesFinished: boolean;
  lastUpdated?: string;
}

export default function SettlementPage() {
  const [status, setStatus] = useState<SettlementStatus | null>(null);
  const [selectedGameweek, setSelectedGameweek] = useState<number>(1);
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const { user, loading: authLoading } = useAuth();

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  useEffect(() => {
    if (user) {
      fetchRooms();
      fetchStatus();
    }
  }, [user, selectedGameweek, selectedRoom]);

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms');
      const result = await response.json();
      if (result.success) {
        setRooms(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        gameweek: selectedGameweek.toString()
      });
      
      if (selectedRoom !== 'ALL') {
        params.append('roomId', selectedRoom);
      }

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/settlement?${params}`, { headers });
      const result = await response.json();
      
      if (result.success) {
        setStatus(result.data);
      } else {
        addLog(`获取状态失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to fetch settlement status:', error);
      addLog(`获取状态出错: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const runSettlement = async (forceRecalculate = false) => {
    if (!status?.canSettle && !forceRecalculate) {
      addLog('无法结算：没有已结束的比赛或没有提交的阵容');
      return;
    }

    setSettling(true);
    addLog(`开始结算第 ${selectedGameweek} 轮${forceRecalculate ? ' (强制重新计算)' : ''}`);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/settlement', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          gameweek: selectedGameweek,
          roomId: selectedRoom !== 'ALL' ? selectedRoom : null,
          forceRecalculate
        })
      });

      const result = await response.json();

      if (result.success) {
        const data = result.data;
        addLog(`结算完成！处理了 ${data.lineupsUpdated} 个阵容，${data.playersProcessed} 个球员`);
        addLog(`总计算积分: ${data.totalPointsCalculated}`);
        
        if (data.errors.length > 0) {
          addLog(`遇到 ${data.errors.length} 个错误`);
          data.errors.slice(0, 3).forEach(error => addLog(`错误: ${error}`));
        }

        // Refresh status
        await fetchStatus();
      } else {
        addLog(`结算失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Settlement error:', error);
      addLog(`结算出错: ${error.message || '网络错误'}`);
    } finally {
      setSettling(false);
    }
  };

  const getStatusColor = (status: SettlementStatus) => {
    if (status.allFixturesFinished && status.lineupsSettled === status.totalLineups) {
      return 'text-green-600 bg-green-50';
    } else if (status.fixturesFinished > 0) {
      return 'text-orange-600 bg-orange-50';
    } else {
      return 'text-blue-600 bg-blue-50';
    }
  };

  const getGameweekOptions = () => {
    const options = [];
    for (let i = 1; i <= 38; i++) {
      options.push(i);
    }
    return options;
  };

  if (!user) {
    return (
      <Layout title="结算管理">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-xl text-gray-600">请先登录</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="结算管理">
      <div className="container mx-auto px-6 py-8">
        
        {/* 控制面板 */}
        <Card className="mb-8">
          <h2 className="text-2xl font-bold mb-6">游戏周结算控制</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">游戏周</label>
              <select
                value={selectedGameweek}
                onChange={(e) => setSelectedGameweek(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              >
                {getGameweekOptions().map(gw => (
                  <option key={gw} value={gw}>第 {gw} 轮</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">房间范围</label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              >
                <option value="ALL">所有房间</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.room_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={fetchStatus} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? '刷新中...' : '刷新状态'}
              </Button>
            </div>
          </div>

          {/* 状态显示 */}
          {status && (
            <div className={`p-4 rounded-lg mb-6 ${getStatusColor(status)}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-semibold">比赛进度</div>
                  <div>{status.fixturesFinished} / {status.totalFixtures} 场已结束</div>
                </div>
                <div>
                  <div className="font-semibold">阵容状态</div>
                  <div>{status.lineupsSettled} / {status.totalLineups} 已结算</div>
                </div>
                <div>
                  <div className="font-semibold">结算状态</div>
                  <div>{status.canSettle ? '可以结算' : '等待比赛结束'}</div>
                </div>
                <div>
                  <div className="font-semibold">最后更新</div>
                  <div>
                    {status.lastUpdated 
                      ? new Date(status.lastUpdated).toLocaleString('zh-CN')
                      : '未更新'
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-4">
            <Button
              onClick={() => runSettlement(false)}
              disabled={settling || !status?.canSettle}
              className="bg-green-600 hover:bg-green-700"
            >
              {settling ? '结算中...' : '开始结算'}
            </Button>
            
            <Button
              onClick={() => runSettlement(true)}
              disabled={settling}
              variant="outline"
              className="text-orange-600 border-orange-600 hover:bg-orange-50"
            >
              {settling ? '重算中...' : '强制重新计算'}
            </Button>
          </div>
        </Card>

        {/* 操作日志 */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">操作日志</h3>
          <div className="bg-gray-50 p-4 rounded-lg h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">暂无日志</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono text-gray-700">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}