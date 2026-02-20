'use client';

import { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../hooks/useAuth';

interface Room {
  id: string;
  room_code: string;
  name: string;
  description: string;
  max_players: number;
  current_players: number;
  season: string;
  gameweek: number;
  is_active: boolean;
  budget_limit: number;
  created_at: string;
  created_by: string;
}

interface RoomMember {
  id: string;
  user_id: string;
  joined_at: string;
  is_active: boolean;
  users: {
    id: string;
    username: string;
    display_name?: string;
  };
}

interface LeagueDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function LeagueDetailPage({ params }: LeagueDetailPageProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const { user } = useAuth();
  const { showToast } = useToast();
  const [roomId, setRoomId] = useState<string>('');

  // Await the params
  useEffect(() => {
    const fetchParams = async () => {
      const resolvedParams = await params;
      setRoomId(resolvedParams.id);
    };
    fetchParams();
  }, [params]);

  useEffect(() => {
    if (roomId) {
      fetchRoomDetails();
    }
  }, [roomId]);

  const fetchRoomDetails = async () => {
    try {
      // Fetch room details
      const roomResponse = await fetch(`/api/rooms/${roomId}`);
      const roomResult = await roomResponse.json();

      if (roomResult.success) {
        setRoom(roomResult.data);
      } else {
        console.error('Failed to fetch room details:', roomResult.error);
      }

      // Fetch room members
      const membersResponse = await fetch(`/api/rooms/${roomId}/members`);
      const membersResult = await membersResponse.json();

      if (membersResult.success) {
        setMembers(membersResult.data || []);
      } else {
        console.error('Failed to fetch room members:', membersResult.error);
      }

    } catch (error) {
      console.error('Error fetching room details:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!user || !room) return;

    setJoinLoading(true);
    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: room.room_code,
          userId: user.id
        })
      });
      const result = await response.json();

      if (result.success) {
        showToast(result.message || '成功加入联赛!', 'success');
        fetchRoomDetails();
      } else {
        showToast(`加入失败: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Join room error:', error);
      showToast('加入联赛时出错', 'error');
    } finally {
      setJoinLoading(false);
    }
  };

  const leaveRoom = async () => {
    if (!user || !room) return;

    if (!confirm('确定要离开这个联赛吗？')) return;

    setLeaveLoading(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const result = await response.json();

      if (result.success) {
        showToast('成功离开联赛', 'success');
        fetchRoomDetails();
      } else {
        showToast(`离开失败: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Leave room error:', error);
      showToast('离开联赛时出错', 'error');
    } finally {
      setLeaveLoading(false);
    }
  };

  const isUserMember = user ? members.some(member =>
    member.user_id === user.id && member.is_active
  ) : false;

  const canJoin = user && room && !isUserMember && room.current_players < room.max_players;

  if (loading) {
    return (
      <Layout title="联赛详情">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-2xl">加载联赛详情中...</div>
        </div>
      </Layout>
    );
  }

  if (!room) {
    return (
      <Layout title="联赛详情">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-xl text-gray-600">联赛不存在或已被删除</div>
          <Button
            onClick={() => window.location.href = '/leagues'}
            className="mt-4"
          >
            返回联赛列表
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${room.name} - 联赛详情`}>
      <div className="container mx-auto px-6 py-12">

        {/* 返回按钮 */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/leagues'}
          >
            ← 返回联赛列表
          </Button>
        </div>

        {/* 联赛基本信息 */}
        <Card className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{room.name}</h1>
              <p className="text-lg text-gray-600">联赛代码: <span className="font-mono font-bold">{room.room_code}</span></p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              room.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {room.is_active ? '进行中' : '已结束'}
            </span>
          </div>

          {room.description && (
            <p className="text-gray-600 mb-6">{room.description}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <span className="text-gray-500 text-sm">参与人数</span>
              <div className="text-2xl font-bold">{room.current_players}/{room.max_players}</div>
            </div>
            <div>
              <span className="text-gray-500 text-sm">预算限制</span>
              <div className="text-2xl font-bold">£{room.budget_limit}m</div>
            </div>
            <div>
              <span className="text-gray-500 text-sm">赛季</span>
              <div className="text-2xl font-bold">{room.season}</div>
            </div>
            <div>
              <span className="text-gray-500 text-sm">当前轮次</span>
              <div className="text-2xl font-bold">GW{room.gameweek}</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            {!user ? (
              <div className="text-gray-600">
                请先 <a href="/login" className="text-blue-600 underline">登录</a> 后加入联赛
              </div>
            ) : canJoin ? (
              <Button
                onClick={joinRoom}
                disabled={joinLoading}
              >
                {joinLoading ? '加入中...' : '加入联赛'}
              </Button>
            ) : isUserMember ? (
              <>
                <Button
                  onClick={() => window.location.href = `/my-team?roomId=${room.id}`}
                >
                  查看我的球队
                </Button>
                <Button
                  variant="outline"
                  onClick={leaveRoom}
                  disabled={leaveLoading}
                >
                  {leaveLoading ? '退出中...' : '退出联赛'}
                </Button>
              </>
            ) : room.current_players >= room.max_players ? (
              <div className="text-gray-600">联赛已满员</div>
            ) : null}
          </div>
        </Card>

        {/* 成员列表 */}
        <Card>
          <h3 className="text-xl font-bold mb-4">联赛成员 ({members.length})</h3>
          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              还没有成员加入这个联赛
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member, index) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">
                        {member.users.display_name || member.users.username}
                        {user && member.user_id === user.id && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">你</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        加入时间: {new Date(member.joined_at).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `/leagues?tab=leaderboard&roomId=${room.id}`}
                    >
                      查看排名
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
