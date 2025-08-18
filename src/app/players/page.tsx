'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PlayerCard from '../../components/PlayerCard';

interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  photo_url?: string | null;
  price: number;
  total_points: number;
  goals: number;
  assists: number;
  teams: {
    name: string;
    short_name: string;
    primary_color: string;
  } | null;
}

interface Team {
  id: string;
  name: string;
  short_name: string;
  logo_url?: string;
  primary_color?: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('total_points');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const playersPerPage = 50;

  useEffect(() => {
    fetchPlayers();
  }, [currentPage, selectedPosition, selectedTeam, sortBy]);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setTeamsLoading(true);
      const response = await fetch('/api/teams');
      const result = await response.json();
      if (result.success) {
        setTeams(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * playersPerPage;
      const params = new URLSearchParams({
        limit: playersPerPage.toString(),
        offset: offset.toString(),
        sortBy,
        sortOrder: 'desc'
      });
      
      if (selectedPosition !== 'ALL') {
        params.append('position', selectedPosition);
      }
      
      if (selectedTeam !== 'ALL') {
        params.append('team', selectedTeam);
      }
      
      const response = await fetch(`/api/players?${params}`);
      const result = await response.json();
      if (result.success) {
        setPlayers(result.data);
        setTotalPlayers(result.pagination.total);
        setHasMore(result.pagination.hasMore);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players; // API handles filtering and sorting

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-100 text-yellow-800';
      case 'DEF': return 'bg-blue-100 text-blue-800';
      case 'MID': return 'bg-green-100 text-green-800';
      case 'FWD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout title="球员市场">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-2xl">加载球员数据中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="球员市场">
      <div className="container mx-auto px-6 py-12">
        
        {/* 筛选器 */}
        <Card className="mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">球队筛选</label>
                <select 
                  value={selectedTeam} 
                  onChange={(e) => {
                    setSelectedTeam(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 min-w-[140px]"
                  disabled={teamsLoading}
                >
                  <option value="ALL">全部球队</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.short_name}>
                      {team.short_name} - {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">位置筛选</label>
                <select 
                  value={selectedPosition} 
                  onChange={(e) => {
                    setSelectedPosition(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="ALL">全部位置</option>
                  <option value="GK">门将 (GK)</option>
                  <option value="DEF">后卫 (DEF)</option>
                  <option value="MID">中场 (MID)</option>
                  <option value="FWD">前锋 (FWD)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">排序方式</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="total_points">总积分</option>
                  <option value="price">价格</option>
                  <option value="name">姓名</option>
                </select>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              显示 {((currentPage - 1) * playersPerPage + 1)} - {Math.min(currentPage * playersPerPage, totalPlayers)} / {totalPlayers} 个球员
            </div>
          </div>
        </Card>

        {/* 球员列表 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredPlayers.map((player) => (
            <PlayerCard key={player.id} {...player} />
          ))}
        </div>
        
        {filteredPlayers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">没有找到符合条件的球员</div>
          </div>
        )}

        {/* 分页控件 */}
        {totalPlayers > playersPerPage && (
          <Card>
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                第 {currentPage} 页，共 {Math.ceil(totalPlayers / playersPerPage)} 页
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  上一页
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!hasMore}
                >
                  下一页
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}