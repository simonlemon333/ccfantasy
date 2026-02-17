'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '@/lib/supabase';

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
}

export default function LeaguesPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    max_players: 10,
    budget_limit: 100.0,
    is_public: false
  });

  const { user } = useAuth();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      console.log('Fetching public rooms from API...'); // Debug log
      // For now, we'll fetch public rooms
      const response = await fetch('/api/rooms?public=true');
      const result = await response.json();
      console.log('API response:', result); // Debug log
      if (result.success) {
        setRooms(result.data || []);
        console.log('Rooms set:', result.data || []); // Debug log
      } else {
        console.error('API returned error:', result.error); // Debug log
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('请先登录后再创建联赛');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers,
        body: JSON.stringify(createForm)
      });
      const result = await response.json();
      console.log('Create room response:', result); // Debug log
      
      if (result.success) {
        setShowCreateForm(false);
        setCreateForm({ name: '', description: '', max_players: 10, budget_limit: 100.0, is_public: false });
        fetchRooms(); // Refresh the list
        alert(`房间创建成功！房间代码: ${result.data.room_code}`);
      } else {
        alert(`创建失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Create room error:', error); // Debug log
      alert('创建房间时出错');
    }
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('请先登录后再加入联赛');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers,
        body: JSON.stringify({ roomCode: joinCode })
      });
      const result = await response.json();
      console.log('Join room response:', result); // Debug log
      
      if (result.success) {
        setShowJoinForm(false);
        setJoinCode('');
        fetchRooms(); // Refresh the list
        alert(result.message || '成功加入联赛！');
      } else {
        alert(`加入失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Join room error:', error); // Debug log
      alert('加入联赛时出错');
    }
  };

  const joinRoomDirectly = async (roomCode: string, roomName: string) => {
    if (!user) {
      alert('请先登录后再加入联赛');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers,
        body: JSON.stringify({ roomCode })
      });
      const result = await response.json();
      console.log('Direct join room response:', result); // Debug log
      
      if (result.success) {
        fetchRooms(); // Refresh the list
        alert(result.message || `成功加入联赛 "${roomName}"！`);
      } else {
        alert(`加入失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Direct join room error:', error); // Debug log
      alert('加入联赛时出错');
    }
  };

  if (loading) {
    return (
      <Layout title="联赛管理">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-2xl">加载联赛数据中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="联赛管理">
      <div className="container mx-auto px-6 py-12">
        
        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-4 mb-8">
          {user ? (
            <>
              <Button onClick={() => setShowCreateForm(true)}>
                创建新联赛
              </Button>
              <Button variant="outline" onClick={() => setShowJoinForm(true)}>
                加入联赛
              </Button>
            </>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-600">
                请先 <a href="/login" className="font-semibold underline">登录</a> 后创建或加入联赛
              </p>
            </div>
          )}
        </div>

        {/* 创建房间表单 */}
        {showCreateForm && (
          <Card className="mb-8">
            <h3 className="text-xl font-bold mb-4">创建新联赛</h3>
            <form onSubmit={createRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">联赛名称</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="例如：朋友圈联赛"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">联赛描述</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="描述这个联赛..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">最大人数</label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={createForm.max_players}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, max_players: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">预算限制 (£m)</label>
                  <input
                    type="number"
                    min="50"
                    max="200"
                    step="0.5"
                    value={createForm.budget_limit}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, budget_limit: parseFloat(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={createForm.is_public}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, is_public: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="is_public" className="text-sm text-gray-700">公开联赛（其他人可以看到并加入）</label>
              </div>
              <div className="flex gap-3">
                <Button type="submit">创建联赛</Button>
                <Button variant="outline" type="button" onClick={() => setShowCreateForm(false)}>
                  取消
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* 加入房间表单 */}
        {showJoinForm && (
          <Card className="mb-8">
            <h3 className="text-xl font-bold mb-4">加入联赛</h3>
            <form onSubmit={joinRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">联赛代码</label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="输入6位数字代码"
                  maxLength={6}
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit">加入联赛</Button>
                <Button variant="outline" type="button" onClick={() => setShowJoinForm(false)}>
                  取消
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* 联赛列表 */}
        <div>
          <h3 className="text-2xl font-bold mb-6">可用联赛</h3>
          {rooms.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">还没有公开联赛</h4>
                <p className="text-gray-600 mb-6">创建第一个联赛，邀请朋友们一起玩！</p>
                <Button onClick={() => setShowCreateForm(true)}>
                  创建第一个联赛
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <Card key={room.id} className="hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">{room.name}</h4>
                      <p className="text-sm text-gray-600">代码: {room.room_code}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      room.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {room.is_active ? '进行中' : '已结束'}
                    </span>
                  </div>
                  
                  {room.description && (
                    <p className="text-gray-600 text-sm mb-4">{room.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-500">参与人数:</span>
                      <div className="font-semibold">{room.current_players}/{room.max_players}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">预算限制:</span>
                      <div className="font-semibold">£{room.budget_limit}m</div>
                    </div>
                    <div>
                      <span className="text-gray-500">赛季:</span>
                      <div className="font-semibold">{room.season}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">轮次:</span>
                      <div className="font-semibold">GW{room.gameweek}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      disabled={room.current_players >= room.max_players}
                      onClick={() => joinRoomDirectly(room.room_code, room.name)}
                    >
                      {room.current_players >= room.max_players ? '已满员' : '加入'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = `/leagues/${room.id}`}
                    >
                      查看详情
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}