'use client';

import Link from 'next/link';
import Button from './ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';

export default function Header() {
  const { user, signOut, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-3xl font-bold text-gray-800 hover:text-blue-600 transition">
            ⚽ CCFantasy
          </Link>
          
          <nav className="hidden md:flex space-x-6 items-center">
            <Link href="/my-team" className="text-gray-600 hover:text-blue-600 font-medium transition">
              我的球队
            </Link>
            <Link href="/leagues" className="text-gray-600 hover:text-blue-600 font-medium transition">
              联赛
            </Link>
            <Link href="/players" className="text-gray-600 hover:text-blue-600 font-medium transition">
              球员市场
            </Link>
            <Link href="/fixtures" className="text-gray-600 hover:text-blue-600 font-medium transition">
              比赛赛程
            </Link>
            <Link href="/leaderboard" className="text-gray-600 hover:text-blue-600 font-medium transition">
              排行榜
            </Link>
            <Link href="/admin" className="text-gray-600 hover:text-blue-600 font-medium transition">
              数据管理
            </Link>
            
            <div className="flex space-x-3 ml-4">
              {loading ? (
                <div className="animate-pulse">加载中...</div>
              ) : user ? (
                // Authenticated user menu
                <div className="flex items-center space-x-3">
                  <span className="text-gray-600">欢迎, {user.user_metadata?.username || user.email}</span>
                  <Button variant="outline" size="sm" onClick={signOut}>
                    退出登录
                  </Button>
                </div>
              ) : (
                // Guest user buttons
                <>
                  <Link href="/login">
                    <Button variant="outline" size="sm">登录</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">注册</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
          
          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-600 hover:text-blue-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 border-t border-gray-200 pt-4">
            <nav className="flex flex-col space-y-3">
              <Link
                href="/my-team"
                className="text-gray-600 hover:text-blue-600 font-medium transition py-2 px-2 rounded hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                我的球队
              </Link>
              <Link
                href="/leagues"
                className="text-gray-600 hover:text-blue-600 font-medium transition py-2 px-2 rounded hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                联赛
              </Link>
              <Link
                href="/players"
                className="text-gray-600 hover:text-blue-600 font-medium transition py-2 px-2 rounded hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                球员市场
              </Link>
              <Link
                href="/fixtures"
                className="text-gray-600 hover:text-blue-600 font-medium transition py-2 px-2 rounded hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                比赛赛程
              </Link>
              <Link
                href="/leaderboard"
                className="text-gray-600 hover:text-blue-600 font-medium transition py-2 px-2 rounded hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                排行榜
              </Link>
              <Link
                href="/admin"
                className="text-gray-600 hover:text-blue-600 font-medium transition py-2 px-2 rounded hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                数据管理
              </Link>

              {/* Mobile auth buttons */}
              <div className="flex flex-col space-y-2 mt-4 pt-4 border-t border-gray-200">
                {loading ? (
                  <div className="animate-pulse text-center">加载中...</div>
                ) : user ? (
                  <div className="flex flex-col space-y-2">
                    <span className="text-gray-600 text-center">欢迎, {user.user_metadata?.username || user.email}</span>
                    <Button variant="outline" size="sm" onClick={signOut} className="w-full">
                      退出登录
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full">登录</Button>
                    </Link>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button size="sm" className="w-full">注册</Button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}