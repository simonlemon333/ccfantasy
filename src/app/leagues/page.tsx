'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '@/lib/supabase';

type TabKey = 'my-leagues' | 'market' | 'leaderboard';

// === Shared types ===
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

interface JoinedRoom {
  room: {
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
  };
  userStats: {
    joinedAt: string;
    hasLineup: boolean;
    totalPoints: number;
    playerCount: number;
    currentRank: number | null;
  };
  roomStats: {
    totalMembers: number;
    totalLineupsSubmitted: number;
  };
  error?: string;
}

interface Summary {
  totalRoomsJoined: number;
  activeRooms: number;
  roomsWithLineups: number;
  totalPoints: number;
  averageRank: number | null;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_points: number;
  gameweek_points: number;
  rank: number;
}

export default function LeaguesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('my-leagues');

  // Market state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '', description: '', max_players: 10, budget_limit: 100.0, is_public: false
  });

  // My leagues state
  const [joinedRooms, setJoinedRooms] = useState<JoinedRoom[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [myLeaguesLoading, setMyLeaguesLoading] = useState(true);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedGameweek, setSelectedGameweek] = useState<number>(1);
  const [viewType, setViewType] = useState<'total' | 'gameweek'>('total');
  const [selectedRoom, setSelectedRoom] = useState<string>('global');
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'market') fetchRooms();
    if (activeTab === 'my-leagues' && user) fetchJoinedRooms();
    if (activeTab === 'leaderboard') fetchLeaderboard();
  }, [activeTab, user]);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedGameweek, viewType, selectedRoom]);

  // === Auth helpers ===
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  // === Market functions ===
  const fetchRooms = async () => {
    try {
      setMarketLoading(true);
      const response = await fetch('/api/rooms?public=true');
      const result = await response.json();
      if (result.success) setRooms(result.data || []);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setMarketLoading(false);
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { showToast('请先登录后再创建联赛', 'error'); return; }
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/rooms', {
        method: 'POST', headers,
        body: JSON.stringify(createForm)
      });
      const result = await response.json();
      if (result.success) {
        setShowCreateForm(false);
        setCreateForm({ name: '', description: '', max_players: 10, budget_limit: 100.0, is_public: false });
        fetchRooms();
        showToast(`联赛创建成功! 代码: ${result.data.room_code}`, 'success');
      } else {
        showToast(`创建失败: ${result.error}`, 'error');
      }
    } catch {
      showToast('创建联赛时出错', 'error');
    }
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { showToast('请先登录后再加入联赛', 'error'); return; }
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/rooms/join', {
        method: 'POST', headers,
        body: JSON.stringify({ roomCode: joinCode })
      });
      const result = await response.json();
      if (result.success) {
        setShowJoinForm(false);
        setJoinCode('');
        fetchRooms();
        showToast(result.message || '成功加入联赛!', 'success');
      } else {
        showToast(`加入失败: ${result.error}`, 'error');
      }
    } catch {
      showToast('加入联赛时出错', 'error');
    }
  };

  const joinRoomDirectly = async (roomCode: string, roomName: string) => {
    if (!user) { showToast('请先登录后再加入联赛', 'error'); return; }
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/rooms/join', {
        method: 'POST', headers,
        body: JSON.stringify({ roomCode })
      });
      const result = await response.json();
      if (result.success) {
        fetchRooms();
        showToast(result.message || `成功加入 "${roomName}"!`, 'success');
      } else {
        showToast(`加入失败: ${result.error}`, 'error');
      }
    } catch {
      showToast('加入联赛时出错', 'error');
    }
  };

  // === My Leagues functions ===
  const fetchJoinedRooms = async () => {
    try {
      setMyLeaguesLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch('/api/rooms/joined', { headers });
      const result = await response.json();
      if (result.success) {
        setJoinedRooms(result.data.rooms || []);
        setSummary(result.data.summary || null);
      }
    } catch (error) {
      console.error('Error fetching joined rooms:', error);
    } finally {
      setMyLeaguesLoading(false);
    }
  };

  const leaveRoom = async (roomId: string, roomName: string) => {
    if (!user) return;
    if (!confirm(`确定要离开联赛 "${roomName}" 吗?`)) return;
    try {
      const response = await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const result = await response.json();
      if (result.success) {
        showToast('成功离开联赛', 'success');
        fetchJoinedRooms();
      } else {
        showToast(`离开失败: ${result.error}`, 'error');
      }
    } catch {
      showToast('离开联赛时出错', 'error');
    }
  };

  // === Leaderboard functions ===
  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const params = new URLSearchParams({
        gameweek: selectedGameweek.toString(),
        scope: viewType
      });
      if (selectedRoom !== 'global') params.append('roomId', selectedRoom);
      const response = await fetch(`/api/leaderboard?${params}`);
      const result = await response.json();
      if (result.success) {
        setLeaderboard(result.data.leaderboard || []);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  // === Tab definitions ===
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'my-leagues', label: '我的联赛' },
    { key: 'market', label: '联赛市场' },
    { key: 'leaderboard', label: '排行榜' },
  ];

  return (
    <Layout title="联赛">
      <div className="container mx-auto px-6 py-8">
        {/* Tab bar */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition text-sm ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===== Tab: 我的联赛 ===== */}
        {activeTab === 'my-leagues' && (
          <>
            {!user ? (
              <Card>
                <div className="text-center py-12">
                  <div className="text-xl text-gray-600 mb-4">请先登录查看您的联赛</div>
                  <Button onClick={() => window.location.href = '/login'}>去登录</Button>
                </div>
              </Card>
            ) : myLeaguesLoading ? (
              <div className="text-center py-12 text-gray-500">加载中...</div>
            ) : (
              <>
                {/* Summary stats */}
                {summary && (
                  <Card className="mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{summary.totalRoomsJoined}</div>
                        <div className="text-xs text-gray-500">已加入</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{summary.activeRooms}</div>
                        <div className="text-xs text-gray-500">活跃</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{summary.roomsWithLineups}</div>
                        <div className="text-xs text-gray-500">已提交阵容</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{summary.totalPoints}</div>
                        <div className="text-xs text-gray-500">总积分</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-pink-600">
                          {summary.averageRank ? Math.round(summary.averageRank) : '-'}
                        </div>
                        <div className="text-xs text-gray-500">平均排名</div>
                      </div>
                    </div>
                  </Card>
                )}

                {joinedRooms.length === 0 ? (
                  <Card>
                    <div className="text-center py-12">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">还没有加入任何联赛</h3>
                      <p className="text-gray-600 mb-6">去联赛市场加入一个吧!</p>
                      <Button onClick={() => setActiveTab('market')}>浏览联赛市场</Button>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {joinedRooms.map(({ room, userStats, roomStats, error }) => (
                      <Card key={room.id} className="hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-gray-800">{room.name}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                room.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {room.isActive ? '进行中' : '已结束'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">代码: <span className="font-mono font-bold">{room.roomCode}</span></p>
                          </div>
                          <div className="text-xs text-gray-400">
                            加入: {new Date(userStats.joinedAt).toLocaleDateString('zh-CN')}
                          </div>
                        </div>

                        {error && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 mb-3 text-sm text-red-600">{error}</div>
                        )}

                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-xs text-gray-500">积分</div>
                            <div className="text-lg font-bold text-blue-600">{userStats.totalPoints}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">排名</div>
                            <div className="text-lg font-bold text-purple-600">
                              {userStats.currentRank ? `#${userStats.currentRank}` : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">成员</div>
                            <div className="text-lg font-bold">{roomStats.totalMembers}/{room.maxPlayers}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">阵容</div>
                            <div className={`text-lg font-bold ${userStats.hasLineup ? 'text-green-600' : 'text-red-500'}`}>
                              {userStats.hasLineup ? '已提交' : '未提交'}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => window.location.href = `/leagues/${room.id}`}>
                            详情
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => window.location.href = `/my-team?roomId=${room.id}`}>
                            管理球队
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => leaveRoom(room.id, room.name)}
                            className="ml-auto text-red-600 border-red-200 hover:bg-red-50"
                          >
                            退出
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ===== Tab: 联赛市场 ===== */}
        {activeTab === 'market' && (
          <>
            {/* Action buttons */}
            <div className="flex flex-wrap gap-4 mb-6">
              {user ? (
                <>
                  <Button onClick={() => setShowCreateForm(true)}>创建新联赛</Button>
                  <Button variant="outline" onClick={() => setShowJoinForm(true)}>输入代码加入</Button>
                </>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-600">
                    请先 <a href="/login" className="font-semibold underline">登录</a> 后创建或加入联赛
                  </p>
                </div>
              )}
            </div>

            {/* Create form */}
            {showCreateForm && (
              <Card className="mb-6">
                <h3 className="text-xl font-bold mb-4">创建新联赛</h3>
                <form onSubmit={createRoom} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">联赛名称</label>
                    <input
                      type="text" required value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="例如: 朋友圈联赛"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">联赛描述</label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">最大人数</label>
                      <input
                        type="number" min="2" max="20" value={createForm.max_players}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, max_players: parseInt(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">预算 (m)</label>
                      <input
                        type="number" min="50" max="200" step="0.5" value={createForm.budget_limit}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, budget_limit: parseFloat(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox" id="is_public" checked={createForm.is_public}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, is_public: e.target.checked }))}
                      className="mr-2"
                    />
                    <label htmlFor="is_public" className="text-sm text-gray-700">公开联赛</label>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit">创建</Button>
                    <Button variant="outline" type="button" onClick={() => setShowCreateForm(false)}>取消</Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Join form */}
            {showJoinForm && (
              <Card className="mb-6">
                <h3 className="text-xl font-bold mb-4">输入联赛代码</h3>
                <form onSubmit={joinRoom} className="flex gap-3">
                  <input
                    type="text" required value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="6位代码" maxLength={6}
                  />
                  <Button type="submit">加入</Button>
                  <Button variant="outline" type="button" onClick={() => setShowJoinForm(false)}>取消</Button>
                </form>
              </Card>
            )}

            {/* Room list */}
            {marketLoading ? (
              <div className="text-center py-12 text-gray-500">加载中...</div>
            ) : rooms.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <h4 className="text-xl font-bold text-gray-800 mb-2">还没有公开联赛</h4>
                  <p className="text-gray-600 mb-4">创建第一个联赛吧!</p>
                  {user && <Button onClick={() => setShowCreateForm(true)}>创建联赛</Button>}
                </div>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map(room => (
                  <Card key={room.id} className="hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">{room.name}</h4>
                        <p className="text-xs text-gray-500">代码: {room.room_code}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        room.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {room.is_active ? '进行中' : '已结束'}
                      </span>
                    </div>
                    {room.description && <p className="text-gray-600 text-sm mb-3">{room.description}</p>}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500">人数:</span>
                        <span className="font-semibold ml-1">{room.current_players}/{room.max_players}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">预算:</span>
                        <span className="font-semibold ml-1">{room.budget_limit}m</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm" className="flex-1"
                        disabled={room.current_players >= room.max_players}
                        onClick={() => joinRoomDirectly(room.room_code, room.name)}
                      >
                        {room.current_players >= room.max_players ? '已满员' : '加入'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.location.href = `/leagues/${room.id}`}>
                        详情
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== Tab: 排行榜 ===== */}
        {activeTab === 'leaderboard' && (
          <>
            {/* Controls */}
            <Card className="mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">查看方式</label>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewType('total')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                        viewType === 'total' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                      }`}
                    >
                      总积分
                    </button>
                    <button
                      onClick={() => setViewType('gameweek')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                        viewType === 'gameweek' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                      }`}
                    >
                      单轮
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">轮次</label>
                  <select
                    value={selectedGameweek}
                    onChange={(e) => setSelectedGameweek(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  >
                    {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
                      <option key={gw} value={gw}>GW{gw}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">范围</label>
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm min-w-32"
                  >
                    <option value="global">全球</option>
                    {joinedRooms.map(({ room }) => (
                      <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* Leaderboard table */}
            {leaderboardLoading ? (
              <div className="text-center py-12 text-gray-500">加载中...</div>
            ) : leaderboard.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">暂无排行榜数据</h3>
                  <p className="text-gray-600">当有玩家提交阵容后，排行榜将显示积分排名</p>
                </div>
              </Card>
            ) : (
              <Card>
                {/* Top 3 podium */}
                {leaderboard.length >= 1 && (
                  <div className="grid grid-cols-3 gap-3 mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4">
                    {leaderboard.slice(0, 3).map(entry => (
                      <div key={entry.user_id} className="text-center">
                        <div className="text-2xl">{getRankIcon(entry.rank)}</div>
                        <div className="font-bold text-sm mt-1">{entry.username}</div>
                        <div className="text-lg font-bold text-blue-600">
                          {viewType === 'total' ? entry.total_points : entry.gameweek_points}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Full table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">排名</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">玩家</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-700">
                          {viewType === 'total' ? '总积分' : '本轮'}
                        </th>
                        {viewType === 'gameweek' && (
                          <th className="px-3 py-2 text-right font-medium text-gray-700">总积分</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leaderboard.map(entry => {
                        const isMe = user && entry.user_id === user.id;
                        return (
                          <tr key={entry.user_id} className={isMe ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                            <td className="px-3 py-2 font-bold">{getRankIcon(entry.rank)}</td>
                            <td className="px-3 py-2">
                              {entry.username}
                              {isMe && <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">你</span>}
                            </td>
                            <td className="px-3 py-2 text-right font-bold">
                              {viewType === 'total' ? entry.total_points : entry.gameweek_points}
                            </td>
                            {viewType === 'gameweek' && (
                              <td className="px-3 py-2 text-right text-gray-500">{entry.total_points}</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
