'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface Room {
  id: string;
  roomCode: string;
  name: string;
  description: string;
  maxPlayers: number;
  currentPlayers: number;
  season: string;
  gameweek: number;
  isActive: boolean;
  isPublic: boolean;
  budgetLimit: number;
  createdAt: string;
}

interface UserStats {
  joinedAt: string;
  hasLineup: boolean;
  totalPoints: number;
  playerCount: number;
  currentRank: number | null;
}

interface RoomStats {
  totalMembers: number;
  totalLineupsSubmitted: number;
}

interface JoinedRoom {
  room: Room;
  userStats: UserStats;
  roomStats: RoomStats;
  error?: string;
}

interface Summary {
  totalRoomsJoined: number;
  activeRooms: number;
  publicRooms: number;
  roomsWithLineups: number;
  totalPoints: number;
  averageRank: number | null;
}

export default function MyLeaguesPage() {
  const [joinedRooms, setJoinedRooms] = useState<JoinedRoom[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchJoinedRooms();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchJoinedRooms = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        console.error('No access token available');
        return;
      }

      const response = await fetch('/api/rooms/joined', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const result = await response.json();

      if (result.success) {
        setJoinedRooms(result.data.rooms || []);
        setSummary(result.data.summary || null);
      } else {
        console.error('Failed to fetch joined rooms:', result.error);
      }
    } catch (error) {
      console.error('Error fetching joined rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const leaveRoom = async (roomId: string, roomName: string) => {
    if (!user) return;

    if (!confirm(`确定要离开联赛 "${roomName}" 吗？`)) return;

    try {
      const response = await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const result = await response.json();

      if (result.success) {
        alert('成功离开联赛');
        fetchJoinedRooms(); // Refresh the data
      } else {
        alert(`离开失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Leave room error:', error);
      alert('离开联赛时出错');
    }
  };

  const deleteRoom = async (roomId: string, roomName: string) => {
    if (!user) return;

    if (!confirm(`确定要删除联赛 "${roomName}" 吗？此操作不可撤销！`)) return;

    try {
      const response = await fetch(`/api/rooms/${roomId}?userId=${user.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();

      if (result.success) {
        alert('联赛删除成功');
        fetchJoinedRooms(); // Refresh the data
      } else {
        alert(`删除失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete room error:', error);
      alert('删除联赛时出错');
    }
  };

  if (!user) {
    return (
      <Layout title="我的联赛">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-xl text-gray-600 mb-4">请先登录查看您的联赛</div>
          <Button onClick={() => window.location.href = '/login'}>
            去登录
          </Button>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout title="我的联赛">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-2xl">加载我的联赛中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="我的联赛">
      <div className="container mx-auto px-6 py-12">

        {/* 页面标题和操作 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">我的联赛</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.location.href = '/leagues'}>
              加入更多联赛
            </Button>
            <Button onClick={fetchJoinedRooms}>
              刷新
            </Button>
          </div>
        </div>

        {/* 概览统计 */}
        {summary && (
          <Card className="mb-8">
            <h3 className="text-xl font-bold mb-4">概览统计</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.totalRoomsJoined}</div>
                <div className="text-sm text-gray-600">已加入联赛</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.activeRooms}</div>
                <div className="text-sm text-gray-600">活跃联赛</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{summary.roomsWithLineups}</div>
                <div className="text-sm text-gray-600">已提交阵容</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.totalPoints}</div>
                <div className="text-sm text-gray-600">总积分</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{summary.publicRooms}</div>
                <div className="text-sm text-gray-600">公开联赛</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600">
                  {summary.averageRank ? Math.round(summary.averageRank) : '-'}
                </div>
                <div className="text-sm text-gray-600">平均排名</div>
              </div>
            </div>
          </Card>
        )}

        {/* 联赛列表 */}
        {joinedRooms.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">还没有加入任何联赛</h3>
              <p className="text-gray-600 mb-6">加入联赛，开始您的梦幻足球之旅！</p>
              <Button onClick={() => window.location.href = '/leagues'}>
                浏览可用联赛
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {joinedRooms.map((joinedRoom) => {
              const { room, userStats, roomStats, error } = joinedRoom;

              return (
                <Card key={room.id} className="hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">{room.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          room.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {room.isActive ? '进行中' : '已结束'}
                        </span>
                        {room.isPublic && (
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            公开
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600">
                        联赛代码: <span className="font-mono font-bold">{room.roomCode}</span>
                      </p>
                      {room.description && (
                        <p className="text-gray-600 mt-2">{room.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        加入时间: {new Date(userStats.joinedAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                      <p className="text-red-600 text-sm">⚠️ {error}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-gray-500 text-sm">我的积分</span>
                      <div className="text-xl font-bold text-blue-600">{userStats.totalPoints}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">我的排名</span>
                      <div className="text-xl font-bold text-purple-600">
                        {userStats.currentRank ? `#${userStats.currentRank}` : '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">联赛成员</span>
                      <div className="text-xl font-bold">{roomStats.totalMembers}/{room.maxPlayers}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">已提交阵容</span>
                      <div className="text-xl font-bold text-green-600">{roomStats.totalLineupsSubmitted}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                    <div>
                      <span className="text-gray-500">赛季:</span>
                      <div className="font-semibold">{room.season}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">当前轮次:</span>
                      <div className="font-semibold">GW{room.gameweek}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">预算限制:</span>
                      <div className="font-semibold">£{room.budgetLimit}m</div>
                    </div>
                    <div>
                      <span className="text-gray-500">阵容状态:</span>
                      <div className={`font-semibold ${userStats.hasLineup ? 'text-green-600' : 'text-red-600'}`}>
                        {userStats.hasLineup ? '已提交' : '未提交'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      size="sm"
                      onClick={() => window.location.href = `/my-team?roomId=${room.id}`}
                    >
                      管理球队
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `/leaderboard?roomId=${room.id}`}
                    >
                      查看排行榜
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `/leagues/${room.id}`}
                    >
                      联赛详情
                    </Button>
                    <div className="ml-auto flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => leaveRoom(room.id, room.name)}
                        className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                      >
                        退出联赛
                      </Button>
                      {/* Only show delete button if user is likely the owner (joined first) */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteRoom(room.id, room.name)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        删除联赛
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}