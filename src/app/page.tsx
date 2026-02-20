'use client';

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';

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
}

function HeroSection() {
  return (
    <>
      <section className="container mx-auto px-6 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-800 mb-6">
            CC <span className="text-blue-600">Fantasy League</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            组建你的梦幻球队，与朋友竞技，体验最刺激的足球经理游戏
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/register">
              <Button size="lg">立即注册</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">登录</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-blue-50 py-16">
        <div className="container mx-auto px-6">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-10">如何开始</h3>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">1</div>
              <h4 className="font-bold text-gray-800 mb-2">组建阵容</h4>
              <p className="text-gray-600 text-sm">选择15名球员，设定阵型和队长</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">2</div>
              <h4 className="font-bold text-gray-800 mb-2">加入联赛</h4>
              <p className="text-gray-600 text-sm">创建或加入联赛，与朋友一起比赛</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">3</div>
              <h4 className="font-bold text-gray-800 mb-2">赢取积分</h4>
              <p className="text-gray-600 text-sm">真实比赛数据计算积分，争夺榜首</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function DashboardSection() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/fixtures?limit=10').then(r => r.json()),
      fetch('/api/players?limit=5&sortBy=total_points&sortOrder=desc').then(r => r.json()),
    ]).then(([fixturesResult, playersResult]) => {
      if (fixturesResult.success) setFixtures(fixturesResult.data || []);
      if (playersResult.success) setTopPlayers(playersResult.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const currentGW = fixtures[0]?.gameweek || '-';

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12 text-center text-gray-500">
        加载中...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Gameweek header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">第 {currentGW} 轮</h2>
        <div className="flex gap-2">
          <Link href="/my-team">
            <Button size="sm">我的阵容</Button>
          </Link>
          <Link href="/leagues">
            <Button variant="outline" size="sm">联赛</Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Fixtures */}
        <Card>
          <h3 className="font-bold text-gray-800 mb-4">比赛赛程</h3>
          {fixtures.length === 0 ? (
            <p className="text-gray-500 text-sm">暂无比赛数据</p>
          ) : (
            <div className="space-y-2">
              {fixtures.map(f => (
                <div key={f.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-medium w-10 text-right">{f.home_team}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      f.finished ? 'bg-gray-100 text-gray-800' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {f.finished ? `${f.home_score} - ${f.away_score}` : 'vs'}
                    </span>
                    <span className="font-medium">{f.away_team}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {f.finished ? '已结束' : new Date(f.kickoff_time).toLocaleDateString('zh-CN', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link href="/fixtures" className="block text-center text-sm text-blue-600 hover:underline mt-4">
            查看全部赛程
          </Link>
        </Card>

        {/* Top players */}
        <Card>
          <h3 className="font-bold text-gray-800 mb-4">热门球员</h3>
          {topPlayers.length === 0 ? (
            <p className="text-gray-500 text-sm">暂无球员数据</p>
          ) : (
            <div className="space-y-2">
              {topPlayers.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                    <div>
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.team} - {p.position}</div>
                    </div>
                  </div>
                  <span className="font-bold text-blue-600">{p.total_points}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/players" className="block text-center text-sm text-blue-600 hover:underline mt-4">
            查看全部球员
          </Link>
        </Card>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <Layout>
      {loading ? (
        <div className="container mx-auto px-6 py-20 text-center text-gray-500">加载中...</div>
      ) : user ? (
        <DashboardSection />
      ) : (
        <HeroSection />
      )}
    </Layout>
  );
}
