'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { AuthUser } from '../lib/auth';
import { auth } from '../lib/auth';

const PROTECTED_PATHS = ['/my-team', '/admin'];

// Custom hook for authentication state management
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Get initial user
    auth.getCurrentUser().then((user) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, []);

  // Redirect to login if on a protected page and not authenticated
  useEffect(() => {
    if (!loading && !user && PROTECTED_PATHS.some(p => pathname?.startsWith(p))) {
      router.replace('/login');
    }
  }, [loading, user, pathname, router]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await auth.signIn(email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    setLoading(true);
    try {
      await auth.signUp(email, password, username);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  };
}
