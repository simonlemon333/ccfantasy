'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_points: number;
  gameweek_points: number;
  rank: number;
  gameweek: number;
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

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedGameweek, setSelectedGameweek] = useState<number>(1);
  const [viewType, setViewType] = useState<'total' | 'gameweek'>('total');
  const [loading, setLoading] = useState(true);
  const [joinedRooms, setJoinedRooms] = useState<JoinedRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('global');
  const [currentRoom, setCurrentRoom] = useState<JoinedRoom | null>(null);

  useEffect(() => {
    if (user) {
      fetchJoinedRooms();
    }
    fetchLeaderboard();
  }, [user]);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedGameweek, viewType, selectedRoom]);

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

  const fetchLeaderboard = async () => {
    try {
      const params = new URLSearchParams({
        gameweek: selectedGameweek.toString(),
        scope: viewType
      });

      // Add roomId if not showing global leaderboard
      if (selectedRoom !== 'global') {
        params.append('roomId', selectedRoom);
      }

      const response = await fetch(`/api/leaderboard?${params}`);
      const result = await response.json();
      if (result.success) {
        setLeaderboard(result.data.leaderboard || []);

        // Set current room info
        if (selectedRoom === 'global') {
          setCurrentRoom(null);
        } else {
          const room = joinedRooms.find(r => r.id === selectedRoom);
          setCurrentRoom(room || null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600 bg-yellow-50';
    if (rank === 2) return 'text-gray-600 bg-gray-50';
    if (rank === 3) return 'text-orange-600 bg-orange-50';
    return 'text-gray-800 bg-white';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank.toString();
  };

  if (loading) {
    return (
      <Layout title="排行榜">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-2xl">加载排行榜数据中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="排行榜">
      <div className="container mx-auto px-6 py-12">
        
        {/* 控制面板 */}
        <Card className="mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">查看方式</label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewType('total')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    viewType === 'total' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  总积分
                </button>
                <button
                  onClick={() => setViewType('gameweek')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    viewType === 'gameweek' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  单轮积分
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">轮次</label>
              <select
                value={selectedGameweek}
                onChange={(e) => setSelectedGameweek(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
                  <option key={gw} value={gw}>第 {gw} 轮</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">联赛范围</label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 min-w-40"
              >
                <option value="global">全球排行榜</option>
                {joinedRooms.map(room => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </div>
            
            <div className="ml-auto text-right">
              <div className="text-sm text-gray-600 mb-1">
                {viewType === 'total' ? '总积分排行' : `第${selectedGameweek}轮积分排行`}
              </div>
              <div className="text-xs text-blue-600 font-medium">
                {currentRoom ? `📍 ${currentRoom.name}` : '🌍 全球排行榜'}
              </div>
            </div>
          </div>
        </Card>

        {/* 联赛信息横幅 */}
        {currentRoom && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🏆</div>
                <div>
                  <h3 className="text-lg font-bold text-blue-800">{currentRoom.name}</h3>
                  <p className="text-sm text-blue-600">
                    联赛代码: {currentRoom.room_code} • 当前游戏周: {currentRoom.gameweek}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">你在该联赛的排名</div>
                <div className="text-xs text-blue-600">
                  {leaderboard.find(entry => user && entry.user_id === user.id) ? (
                    <span className="font-bold">#{leaderboard.find(entry => user && entry.user_id === user.id)?.rank}</span>
                  ) : (
                    <span>未参与</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 排行榜 */}
        {leaderboard.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">暂无排行榜数据</h3>
              <p className="text-gray-600">
                当有玩家提交阵容后，排行榜将显示积分排名
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* 前三名特殊展示 */}
            {leaderboard.slice(0, 3).length > 0 && (
              <Card className="bg-gradient-to-r from-yellow-50 to-orange-50">
                <h3 className="text-xl font-bold mb-6 text-center">🏆 领奖台 🏆</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {leaderboard.slice(0, 3).map((entry) => (
                    <div key={entry.user_id} className={`text-center p-4 rounded-lg ${getRankColor(entry.rank)}`}>
                      <div className="text-4xl mb-2">{getRankIcon(entry.rank)}</div>
                      <div className="font-bold text-lg">{entry.username}</div>
                      <div className="text-2xl font-bold mt-2">
                        {viewType === 'total' ? entry.total_points : entry.gameweek_points} 分
                      </div>
                      {viewType === 'gameweek' && (
                        <div className="text-sm text-gray-600 mt-1">
                          总积分: {entry.total_points}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 完整排行榜 */}
            <Card>
              <h3 className="text-xl font-bold mb-6">完整排行榜</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">排名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">玩家</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        {viewType === 'total' ? '总积分' : '本轮积分'}
                      </th>
                      {viewType === 'gameweek' && (
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">总积分</th>
                      )}
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">变化</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leaderboard.map((entry, index) => {
                      const isCurrentUser = user && entry.user_id === user.id;
                      return (
                        <tr
                          key={entry.user_id}
                          className={`hover:bg-gray-50 ${getRankColor(entry.rank)} ${
                            isCurrentUser ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                          }`}
                        >
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <span className="text-lg font-bold mr-2">{getRankIcon(entry.rank)}</span>
                            <span className="text-sm text-gray-600">#{entry.rank}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">
                            {entry.username}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">你</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-lg font-bold">
                            {viewType === 'total' ? entry.total_points : entry.gameweek_points}
                          </span>
                        </td>
                        {viewType === 'gameweek' && (
                          <td className="px-4 py-4 text-right text-gray-600">
                            {entry.total_points}
                          </td>
                        )}
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm text-gray-500">-</span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* 积分说明 */}
        <Card className="mt-8">
          <h4 className="text-lg font-bold mb-4">积分规则</h4>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h5 className="font-semibold mb-2">进攻得分</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• 进球: 前锋(4分) / 中场(5分) / 后卫(6分) / 门将(6分)</li>
                <li>• 助攻: 所有位置(3分)</li>
                <li>• 点球得分: 额外(3分)</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-2">防守得分</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• 零封(未失球): 后卫/门将(4分) / 中场(1分)</li>
                <li>• 门将扑救: 每3次(1分)</li>
                <li>• 点球扑出: (5分)</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-2">其他</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• 上场时间60分钟+: (2分)</li>
                <li>• 上场时间60分钟-: (1分)</li>
                <li>• 队长: 得分翻倍</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-2">扣分</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• 黄牌: (-1分)</li>
                <li>• 红牌: (-3分)</li>
                <li>• 自摆乌龙: (-2分)</li>
                <li>• 点球失误: (-2分)</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}