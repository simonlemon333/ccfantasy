'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from './ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/fixtures', label: '比赛' },
  { href: '/players', label: '球员' },
  { href: '/my-team', label: '我的阵容' },
  { href: '/leagues', label: '联赛' },
];

export default function Header() {
  const { user, signOut, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-3xl font-bold text-gray-800 hover:text-blue-600 transition">
            CCFantasy
          </Link>

          <nav className="hidden md:flex space-x-1 items-center">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg font-medium transition text-sm ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            ))}

            <div className="flex space-x-3 ml-4">
              {loading ? (
                <div className="animate-pulse">...</div>
              ) : user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-gray-600 text-sm">{user.user_metadata?.username || user.email}</span>
                  <Link href="/admin" className="text-xs text-gray-400 hover:text-blue-600 transition">
                    管理
                  </Link>
                  <Button variant="outline" size="sm" onClick={signOut}>
                    退出
                  </Button>
                </div>
              ) : (
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
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 border-t border-gray-200 pt-4">
            <nav className="flex flex-col space-y-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`py-2 px-3 rounded-lg font-medium transition ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {/* Mobile auth buttons */}
              <div className="flex flex-col space-y-2 mt-4 pt-4 border-t border-gray-200">
                {loading ? (
                  <div className="animate-pulse text-center">...</div>
                ) : user ? (
                  <div className="flex flex-col space-y-2">
                    <span className="text-gray-600 text-center text-sm">{user.user_metadata?.username || user.email}</span>
                    <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full text-xs">管理</Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={signOut} className="w-full">
                      退出
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
