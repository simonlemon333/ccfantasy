'use client';

import { useState } from 'react';
import Layout from '../../../components/Layout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

export default function LeagueDebugPage() {
  const [roomId, setRoomId] = useState('');
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const debugRoom = async () => {
    if (!roomId) {
      alert('请输入房间ID');
      return;
    }

    setLoading(true);
    try {
      // Check room details
      const roomResponse = await fetch(`/api/rooms/${roomId}`);
      const roomResult = await roomResponse.json();

      // Check leaderboard
      const leaderboardResponse = await fetch(`/api/rooms/${roomId}/leaderboard`);
      const leaderboardResult = await leaderboardResponse.json();

      setDebugData({
        room: roomResult,
        leaderboard: leaderboardResult,
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
    <Layout title="联赛调试">
      <div className="container mx-auto px-6 py-8">
        <Card className="mb-8">
          <h1 className="text-2xl font-bold mb-6">联赛数据调试</h1>
          
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="输入房间ID"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
            />
            <Button onClick={debugRoom} disabled={loading}>
              {loading ? '调试中...' : '开始调试'}
            </Button>
          </div>

          {debugData && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">房间详情</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(debugData.room, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">排行榜数据</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(debugData.leaderboard, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">调试摘要</h3>
                <div className="bg-blue-50 p-4 rounded">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>房间状态:</strong> {debugData.room.success ? '✅ 成功' : '❌ 失败'}
                    </div>
                    <div>
                      <strong>排行榜状态:</strong> {debugData.leaderboard.success ? '✅ 成功' : '❌ 失败'}
                    </div>
                    <div>
                      <strong>成员数量:</strong> {debugData.room.data?.room_members?.length || 0}
                    </div>
                    <div>
                      <strong>排行榜条目:</strong> {debugData.leaderboard.data?.leaderboard?.length || 0}
                    </div>
                    <div>
                      <strong>活跃成员:</strong> {
                        debugData.room.data?.room_members?.filter((m: any) => m.is_active && m.users)?.length || 0
                      }
                    </div>
                    <div>
                      <strong>当前游戏周:</strong> {debugData.room.data?.gameweek || 'N/A'}
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