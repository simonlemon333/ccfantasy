'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
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
  is_public: boolean;
  budget_limit: number;
  created_at: string;
  created_by: string;
  users?: {
    username: string;
    display_name?: string;
  };
}

interface Member {
  user_id: string;
  joined_at: string;
  is_active: boolean;
  users?: {
    username: string;
    display_name?: string;
    avatar_url?: string;
  } | null;
}

interface LineupPlayer {
  id: string;
  player_id: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  is_starter: boolean;
  is_captain: boolean;
  is_vice_captain: boolean;
  points_scored: number;
  players: {
    id: string;
    name: string;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    price: number;
    total_points: number;
    photo_url?: string;
    teams: {
      short_name: string;
      name: string;
      primary_color?: string;
    };
  };
}

interface LeaderboardEntry {
  id: string;
  user_id: string;
  gameweek: number;
  total_points: number;
  gameweek_points: number;
  formation: string;
  captain_id?: string;
  vice_captain_id?: string;
  total_cost: number;
  is_submitted: boolean;
  submitted_at?: string;
  rank: number;
  users: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  lineup_players: LineupPlayer[];
}

export default function LeagueDetailsPage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'leaderboard'>('leaderboard');
  const [selectedLineup, setSelectedLineup] = useState<LeaderboardEntry | null>(null);
  
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const roomId = params?.id as string;

  useEffect(() => {
    if (roomId) {
      fetchRoomDetails();
      fetchLeaderboard();
    }
  }, [roomId, user]);

  const fetchRoomDetails = async () => {
    try {
      console.log('Fetching room details for:', roomId);
      const response = await fetch(`/api/rooms/${roomId}`);
      const result = await response.json();
      
      console.log('Room API response:', result);
      
      if (result.success) {
        setRoom(result.data);
        setMembers(result.data.room_members || []);
        
        console.log('Room members:', result.data.room_members);
        console.log('Active members with users:', result.data.room_members?.filter((m: Member) => m.is_active && m.users));
        
        // Check if current user is already a member
        if (user) {
          const isMember = result.data.room_members?.some(
            (member: Member) => member.user_id === user.id && member.is_active
          );
          setIsJoined(!!isMember);
          console.log('User membership check:', { userId: user.id, isMember });
        }
      } else {
        console.error('Failed to fetch room details:', result.error);
        alert(`获取联赛详情失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Error fetching room details:', error);
      alert('获取联赛详情时出错');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      console.log('Fetching leaderboard for room:', roomId);
      const response = await fetch(`/api/rooms/${roomId}/leaderboard`);
      const result = await response.json();
      
      console.log('Leaderboard API response:', result);
      
      if (result.success) {
        setLeaderboard(result.data.leaderboard || []);
        console.log('Leaderboard entries:', result.data.leaderboard?.length || 0);
      } else {
        console.error('Failed to fetch leaderboard:', result.error);
        console.log('Leaderboard error details:', result);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const joinRoom = async () => {
    if (!user || !room) {
      alert('请先登录');
      return;
    }

    setIsJoining(true);
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
        setIsJoined(true);
        fetchRoomDetails(); // Refresh to get updated member list
        alert(result.message || '成功加入联赛！');
      } else {
        alert(`加入失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Join room error:', error);
      alert('加入联赛时出错');
    } finally {
      setIsJoining(false);
    }
  };

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
          <div className="text-2xl text-red-600">联赛不存在或已被删除</div>
          <Button className="mt-4" onClick={() => router.push('/leagues')}>
            返回联赛列表
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`联赛详情 - ${room.name}`}>
      <div className="container mx-auto px-6 py-8">
        {/* 返回按钮 */}
        <Button 
          variant="outline" 
          className="mb-6"
          onClick={() => router.push('/leagues')}
        >
          ← 返回联赛列表
        </Button>

        {/* 联赛基本信息 */}
        <Card className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{room.name}</h1>
              <p className="text-lg text-gray-600">联赛代码: <span className="font-mono font-bold">{room.room_code}</span></p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                room.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {room.is_active ? '进行中' : '已结束'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                room.is_public ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {room.is_public ? '公开联赛' : '私人联赛'}
              </span>
            </div>
          </div>

          {room.description && (
            <p className="text-gray-700 mb-6">{room.description}</p>
          )}

          <div className="grid md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{members.filter(m => m.is_active && m.users).length}</div>
              <div className="text-sm text-gray-600">当前人数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{room.max_players}</div>
              <div className="text-sm text-gray-600">最大人数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">£{room.budget_limit}m</div>
              <div className="text-sm text-gray-600">预算限制</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">GW{room.gameweek}</div>
              <div className="text-sm text-gray-600">当前轮次</div>
            </div>
          </div>

          {user && !isJoined && room.is_active && (
            <div className="border-t pt-6">
              <Button 
                onClick={joinRoom}
                disabled={isJoining || room.current_players >= room.max_players}
                className="w-full md:w-auto"
              >
                {isJoining ? '加入中...' : 
                 room.current_players >= room.max_players ? '联赛已满' : '加入这个联赛'}
              </Button>
            </div>
          )}

          {isJoined && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <span className="text-xl">✓</span>
                  <span className="font-semibold">你已加入这个联赛</span>
                </div>
                <Link href="/my-team">
                  <Button variant="outline" size="sm">
                    前往我的球队
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>

        {/* 标签页导航 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'leaderboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                积分排行榜
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'members'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                成员列表 ({members.filter(m => m.is_active && m.users).length})
              </button>
            </nav>
          </div>
        </div>

        {/* 积分排行榜 */}
        {activeTab === 'leaderboard' && (
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">积分排行榜</h2>
              <div className="text-sm text-gray-600">
                游戏周 {room.gameweek} • {leaderboard.length} 支队伍
              </div>
            </div>
            
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无队伍提交阵容
              </div>
            ) : (
              <div className="space-y-4">
                {leaderboard.map((entry) => {
                  const userName = entry.users?.display_name || entry.users?.username || 'Unknown User';
                  const userInitial = userName.charAt(0).toUpperCase();
                  
                  return (
                    <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                         onClick={() => setSelectedLineup(entry)}>
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 flex items-center justify-center text-white font-bold rounded ${
                          entry.rank === 1 ? 'bg-yellow-500' :
                          entry.rank === 2 ? 'bg-gray-400' :
                          entry.rank === 3 ? 'bg-orange-600' :
                          'bg-blue-500'
                        }`}>
                          {entry.rank}
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {userInitial}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {userName}
                          </div>
                          <div className="text-sm text-gray-600">
                            阵型: {entry.formation} • 成本: £{entry.total_cost}m
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {entry.total_points}
                        </div>
                        <div className="text-sm text-gray-600">
                          本轮: {entry.gameweek_points}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* 成员列表 */}
        {activeTab === 'members' && (
          <Card>
          <h2 className="text-2xl font-bold mb-6">成员列表 ({members.filter(m => m.is_active && m.users).length})</h2>
          
          {members.filter(m => m.is_active && m.users).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              还没有成员加入这个联赛
            </div>
          ) : (
            <div className="grid gap-4">
              {members
                .filter(member => member.is_active && member.users)
                .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
                .map((member, index) => {
                  const userName = member.users?.display_name || member.users?.username || 'Unknown User';
                  const userInitial = userName.charAt(0).toUpperCase();
                  
                  return (
                    <div key={member.user_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {userInitial}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {userName}
                          </div>
                          <div className="text-sm text-gray-600">
                            加入时间: {new Date(member.joined_at).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                            创建者
                          </span>
                        )}
                        {member.user_id === user?.id && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                            你
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
        )}

        {/* 阵容详情模态框 */}
        {selectedLineup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedLineup(null)}>
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">
                  {selectedLineup.users?.display_name || selectedLineup.users?.username} 的阵容
                </h3>
                <button 
                  onClick={() => setSelectedLineup(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedLineup.total_points}</div>
                  <div className="text-sm text-gray-600">总积分</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedLineup.gameweek_points}</div>
                  <div className="text-sm text-gray-600">本轮积分</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">£{selectedLineup.total_cost}m</div>
                  <div className="text-sm text-gray-600">队伍价值</div>
                </div>
              </div>

              {/* 阵容显示 */}
              <div className="bg-green-100 rounded-lg p-6">
                <h4 className="text-lg font-semibold mb-4 text-center">阵型: {selectedLineup.formation}</h4>
                
                {/* 按位置分组显示球员 */}
                {['GK', 'DEF', 'MID', 'FWD'].map((position) => {
                  const positionPlayers = selectedLineup.lineup_players
                    .filter(p => p.position === position && p.is_starter)
                    .sort((a, b) => a.players.name.localeCompare(b.players.name));
                  
                  if (positionPlayers.length === 0) return null;
                  
                  return (
                    <div key={position} className="mb-4">
                      <div className="text-sm font-semibold text-gray-700 mb-2">
                        {position === 'GK' ? '门将' : 
                         position === 'DEF' ? '后卫' : 
                         position === 'MID' ? '中场' : '前锋'}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {positionPlayers.map((lineupPlayer) => (
                          <div key={lineupPlayer.id} className="bg-white rounded p-3 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                {lineupPlayer.players.photo_url ? (
                                  <img 
                                    src={lineupPlayer.players.photo_url} 
                                    alt={lineupPlayer.players.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-bold">
                                    {lineupPlayer.players.name.split(' ').map(n => n[0]).join('')}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-sm truncate">
                                    {lineupPlayer.players.name.split(' ').pop()}
                                  </span>
                                  {lineupPlayer.is_captain && (
                                    <span className="bg-yellow-100 text-yellow-800 text-xs px-1 rounded">C</span>
                                  )}
                                  {lineupPlayer.is_vice_captain && (
                                    <span className="bg-gray-100 text-gray-800 text-xs px-1 rounded">V</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {lineupPlayer.players.teams.short_name} • £{lineupPlayer.players.price}m
                                </div>
                                <div className="text-xs font-semibold text-green-600">
                                  {lineupPlayer.points_scored} 分
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* 替补球员 */}
                {selectedLineup.lineup_players.filter(p => !p.is_starter).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-300">
                    <div className="text-sm font-semibold text-gray-700 mb-2">替补</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                      {selectedLineup.lineup_players
                        .filter(p => !p.is_starter)
                        .map((lineupPlayer) => (
                          <div key={lineupPlayer.id} className="bg-gray-50 rounded p-2">
                            <div className="text-xs font-semibold truncate">
                              {lineupPlayer.players.name.split(' ').pop()}
                            </div>
                            <div className="text-xs text-gray-600">
                              {lineupPlayer.players.teams.short_name} • {lineupPlayer.points_scored}分
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
