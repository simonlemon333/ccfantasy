'use client';

import { useState } from 'react';
import Layout from '../../../components/Layout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';

export default function LineupSubmitDebugPage() {
  const [roomCode, setRoomCode] = useState('');
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const checkLineupStatus = async () => {
    if (!user) {
      alert('请先登录');
      return;
    }

    setLoading(true);
    try {
      // 1. Check user's lineups
      const lineupsResponse = await fetch(`/api/lineups?userId=${user.id}`);
      const lineupsResult = await lineupsResponse.json();

      // 2. Check joined rooms
      const roomsResponse = await fetch('/api/rooms/joined', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      const roomsResult = await roomsResponse.json();

      // 3. If room code provided, check that specific room
      let roomInfo = null;
      if (roomCode.trim()) {
        const roomByCodeResponse = await fetch(`/api/rooms?code=${roomCode.trim()}`);
        const roomByCodeResult = await roomByCodeResponse.json();
        roomInfo = roomByCodeResult;
      }

      setDebugData({
        user: user,
        lineups: lineupsResult,
        joinedRooms: roomsResult,
        specificRoom: roomInfo,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Debug error:', error);
      alert('调试时出错');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="阵容提交调试">
      <div className="container mx-auto px-6 py-8">
        <Card className="mb-8">
          <h1 className="text-2xl font-bold mb-6">阵容提交状态调试</h1>
          
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="输入房间代码（可选）"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
            />
            <Button onClick={checkLineupStatus} disabled={loading || !user}>
              {loading ? '检查中...' : '检查状态'}
            </Button>
          </div>

          {!user && (
            <div className="bg-yellow-50 p-4 rounded mb-6">
              <div className="text-yellow-800">⚠️ 请先登录以检查阵容状态</div>
            </div>
          )}

          {debugData && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">用户信息</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(debugData.user, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">用户阵容</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(debugData.lineups, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">已加入房间</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(debugData.joinedRooms, null, 2)}
                </pre>
              </div>

              {debugData.specificRoom && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">指定房间信息</h3>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(debugData.specificRoom, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-2">状态摘要</h3>
                <div className="bg-blue-50 p-4 rounded">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>用户ID:</strong> {debugData.user?.id || 'N/A'}
                    </div>
                    <div>
                      <strong>阵容数量:</strong> {debugData.lineups?.data?.length || 0}
                    </div>
                    <div>
                      <strong>加入房间数:</strong> {debugData.joinedRooms?.data?.length || 0}
                    </div>
                    <div>
                      <strong>提交状态:</strong> {
                        debugData.lineups?.data?.some((l: any) => l.is_submitted) ? '✅ 有已提交' : '❌ 无提交'
                      }
                    </div>
                    <div>
                      <strong>草稿状态:</strong> {
                        debugData.lineups?.data?.some((l: any) => !l.is_submitted) ? '✅ 有草稿' : '❌ 无草稿'
                      }
                    </div>
                    <div>
                      <strong>可提交:</strong> {
                        debugData.lineups?.data?.some((l: any) => !l.is_submitted) && 
                        debugData.joinedRooms?.data?.length > 0 ? '✅ 是' : '❌ 否'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}