'use client';

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { getTeamInfo } from '../lib/teamHelpers';
import { supabase } from '@/lib/supabase';

interface Fixture {
  id: string;
  gameweek: number;
  kickoff_time: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  finished: boolean;
}

interface TopPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  total_points: number;
  photo_url?: string | null;
  form?: number;
  goals?: number;
  assists?: number;
  price?: number;
}

interface JoinedRoom {
  id: string;
  room_code: string;
  name: string;
  gameweek: number;
  is_active: boolean;
}

// ─── Position badge colors ───
const POS_STYLES: Record<string, string> = {
  GK: 'bg-amber-400 text-amber-950',
  DEF: 'bg-sky-500 text-white',
  MID: 'bg-emerald-500 text-white',
  FWD: 'bg-rose-500 text-white',
};

// ─── Team logo component ───
function TeamLogo({ shortName, size = 28 }: { shortName: string; size?: number }) {
  const info = getTeamInfo(shortName);
  if (!info) return <span className="font-bold text-sm">{shortName}</span>;
  return (
    <img
      src={info.logo_url}
      alt={info.name}
      width={size}
      height={size}
      className="object-contain"
      loading="lazy"
    />
  );
}

// ─── Hero for guests ───
function HeroSection() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }} />
        <div className="relative container mx-auto px-6 py-24">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white/90 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
              2025/26 英超赛季
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
              CC Fantasy
              <span className="block text-blue-200">League</span>
            </h1>
            <p className="text-lg text-blue-100 mb-10 leading-relaxed">
              组建你的梦幻球队，与朋友竞技，体验最刺激的足球经理游戏
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/register"
                className="px-8 py-3 bg-white text-blue-700 font-bold text-lg rounded-lg shadow-xl shadow-blue-900/30 hover:bg-blue-50 hover:scale-105 transition-all"
              >
                立即注册
              </Link>
              <Link
                href="/login"
                className="px-8 py-3 border-2 border-white/40 text-white font-semibold text-lg rounded-lg hover:bg-white/10 hover:scale-105 transition-all"
              >
                登录
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h3 className="text-2xl font-bold text-center text-gray-800 mb-12">三步开始游戏</h3>
          <div className="grid md:grid-cols-3 gap-10 max-w-3xl mx-auto">
            {[
              { step: '1', title: '组建阵容', desc: '挑选11名球员，设定阵型和队长', color: 'from-blue-500 to-blue-600' },
              { step: '2', title: '加入联赛', desc: '创建或加入联赛，与朋友一起比赛', color: 'from-emerald-500 to-emerald-600' },
              { step: '3', title: '赢取积分', desc: '真实比赛数据计算积分，争夺榜首', color: 'from-purple-500 to-purple-600' },
            ].map(item => (
              <div key={item.step} className="text-center group">
                <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  {item.step}
                </div>
                <h4 className="font-bold text-gray-800 mb-1">{item.title}</h4>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Single fixture row ───
function FixtureRow({ f }: { f: Fixture }) {
  const homeInfo = getTeamInfo(f.home_team);
  const awayInfo = getTeamInfo(f.away_team);

  return (
    <div className="flex items-center py-3 px-3 rounded-xl hover:bg-gray-50/80 transition-colors group">
      {/* Home */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <span className="font-semibold text-sm text-gray-800 hidden sm:inline">{homeInfo?.name || f.home_team}</span>
        <span className="font-bold text-xs text-gray-500 sm:hidden">{f.home_team}</span>
        <TeamLogo shortName={f.home_team} size={26} />
      </div>

      {/* Score / vs */}
      <div className="mx-3 min-w-[64px] text-center">
        {f.finished ? (
          <div className="inline-flex items-center gap-1 bg-gray-900 text-white px-3 py-1 rounded-lg font-mono font-bold text-sm tracking-wider">
            <span>{f.home_score}</span>
            <span className="text-gray-500">-</span>
            <span>{f.away_score}</span>
          </div>
        ) : (
          <div className="inline-flex flex-col items-center">
            <span className="text-[10px] text-gray-400 font-medium">
              {new Date(f.kickoff_time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
            </span>
            <span className="text-xs font-bold text-blue-600">
              {new Date(f.kickoff_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Away */}
      <div className="flex items-center gap-2 flex-1">
        <TeamLogo shortName={f.away_team} size={26} />
        <span className="font-semibold text-sm text-gray-800 hidden sm:inline">{awayInfo?.name || f.away_team}</span>
        <span className="font-bold text-xs text-gray-500 sm:hidden">{f.away_team}</span>
      </div>
    </div>
  );
}

// ─── Single player card ───
function PlayerRow({ player, rank }: { player: TopPlayer; rank: number }) {
  const teamInfo = getTeamInfo(player.team);
  const posStyle = POS_STYLES[player.position] || 'bg-gray-200 text-gray-700';

  return (
    <div className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-gray-50/80 transition-colors">
      {/* Rank */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
        rank === 1 ? 'bg-amber-100 text-amber-700' :
        rank === 2 ? 'bg-gray-100 text-gray-600' :
        rank === 3 ? 'bg-orange-100 text-orange-700' :
        'bg-gray-50 text-gray-400'
      }`}>
        {rank}
      </div>

      {/* Photo + info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {player.photo_url ? (
          <img src={player.photo_url} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100 ring-2 ring-gray-100" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ring-2 ring-gray-100">
            <span className="text-gray-500 text-xs font-bold">{player.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold text-sm text-gray-900 truncate">{player.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {teamInfo && <img src={teamInfo.logo_url} alt="" className="w-3.5 h-3.5" />}
            <span className="text-xs text-gray-500">{teamInfo?.name || player.team}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${posStyle}`}>{player.position}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="text-right shrink-0">
        <div className="text-lg font-black text-blue-600">{player.total_points}</div>
        <div className="text-[10px] text-gray-400 font-medium">积分</div>
      </div>
    </div>
  );
}

// ─── Dashboard for logged-in users ───
function DashboardSection() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<JoinedRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch fixtures and players in parallel
        const [fixturesResult, playersResult] = await Promise.all([
          fetch('/api/fixtures?limit=10').then(r => r.json()),
          fetch('/api/players?limit=5&sortBy=total_points&sortOrder=desc').then(r => r.json()),
        ]);

        if (fixturesResult.success) setFixtures(fixturesResult.data || []);
        if (playersResult.success) setTopPlayers(playersResult.data || []);

        // Fetch joined rooms (needs auth)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const roomsResult = await fetch('/api/rooms/joined', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          }).then(r => r.json());
          if (roomsResult.success) {
            setJoinedRooms(roomsResult.data || []);
          }
        }
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const currentGW = fixtures[0]?.gameweek || '-';
  const finishedFixtures = fixtures.filter(f => f.finished);
  const upcomingFixtures = fixtures.filter(f => !f.finished);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-6">
      {/* Gameweek header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-4 py-1.5 rounded-xl font-black text-lg shadow-lg shadow-blue-600/20">
              GW{currentGW}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">第 {currentGW} 轮</h2>
              <p className="text-xs text-gray-500">2025/26 英超赛季</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/my-team">
            <Button size="sm">我的阵容</Button>
          </Link>
          <Link href="/leagues">
            <Button variant="outline" size="sm">联赛</Button>
          </Link>
        </div>
      </div>

      {/* My leagues quick access */}
      {joinedRooms.length > 0 && (
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
          {joinedRooms.map(room => (
            <Link
              key={room.id}
              href={`/leagues/${room.id}`}
              className="shrink-0 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="font-medium text-sm text-gray-700 group-hover:text-blue-600">{room.name}</span>
              <span className="text-xs text-gray-400">GW{room.gameweek}</span>
            </Link>
          ))}
          <Link
            href="/leagues"
            className="shrink-0 flex items-center gap-1 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-2.5 hover:border-blue-300 transition-colors text-sm text-gray-500 hover:text-blue-600"
          >
            + 加入更多
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Fixtures — takes 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          {/* Finished matches */}
          {finishedFixtures.length > 0 && (
            <Card className="!p-4">
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <h3 className="font-bold text-gray-800 text-sm">最近比分</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {finishedFixtures.slice(0, 5).map(f => (
                  <FixtureRow key={f.id} f={f} />
                ))}
              </div>
            </Card>
          )}

          {/* Upcoming matches */}
          {upcomingFixtures.length > 0 && (
            <Card className="!p-4">
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="font-bold text-gray-800 text-sm">即将开始</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {upcomingFixtures.slice(0, 5).map(f => (
                  <FixtureRow key={f.id} f={f} />
                ))}
              </div>
            </Card>
          )}

          {fixtures.length === 0 && (
            <Card>
              <p className="text-gray-400 text-center py-8">暂无比赛数据</p>
            </Card>
          )}

          <Link href="/fixtures" className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
            查看全部赛程 &rarr;
          </Link>
        </div>

        {/* Players — takes 2 columns */}
        <div className="lg:col-span-2">
          <Card className="!p-4">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="font-bold text-gray-800 text-sm">热门球员 TOP 5</h3>
              <Link href="/players" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                全部 &rarr;
              </Link>
            </div>
            {topPlayers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无球员数据</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {topPlayers.map((p, i) => (
                  <PlayerRow key={p.id} player={p} rank={i + 1} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <Layout>
      {loading ? (
        <div className="container mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-3 text-gray-400">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            加载中...
          </div>
        </div>
      ) : user ? (
        <DashboardSection />
      ) : (
        <HeroSection />
      )}
    </Layout>
  );
}
