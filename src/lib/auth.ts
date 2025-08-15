'use client';

import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  user_metadata?: {
    username?: string;
    display_name?: string;
  };
}

class AuthService {
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      return {
        id: user.id,
        email: user.email || '',
        username: user.user_metadata?.username,
        user_metadata: user.user_metadata
      };
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.user_metadata?.username,
          user_metadata: session.user.user_metadata
        };
        callback(authUser);
      } else {
        callback(null);
      }
    });
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    return {
      id: data.user.id,
      email: data.user.email || '',
      username: data.user.user_metadata?.username,
      user_metadata: data.user.user_metadata
    };
  }

  async signUp(email: string, password: string, username: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          display_name: username
        }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    // Create user profile in public.users table
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: data.user.id,
          email: data.user.email,
          username: username,
          display_name: username
        }
      ]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't throw here, user is created in auth but profile failed
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
      username: username,
      user_metadata: data.user.user_metadata
    };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }
}

export const auth = new AuthService();