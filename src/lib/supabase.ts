import { mockDatabase } from './mockDatabase';
import { mockAuth } from './mockAuth';

// Mock Supabase client that provides the same API as real Supabase
export const supabase = {
  // Database operations
  from: mockDatabase.from.bind(mockDatabase),
  
  // Auth operations
  auth: {
    signUp: mockAuth.signUp.bind(mockAuth),
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const data = await mockAuth.signIn(email, password);
      return { data, error: null };
    },
    signOut: mockAuth.signOut.bind(mockAuth),
    getUser: async () => {
      const user = await mockAuth.getCurrentUser();
      return { data: { user }, error: null };
    },
    onAuthStateChange: mockAuth.onAuthStateChange.bind(mockAuth),
    resetPasswordForEmail: mockAuth.resetPassword.bind(mockAuth),
  }
};

// Type definitions for our database tables
export type User = {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

export type League = {
  id: string;
  name: string;
  description?: string;
  max_players: number;
  current_players: number;
  season: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  user_id: string;
  league_id: string;
  team_name: string;
  budget_remaining: number;
  total_points: number;
  weekly_points: number;
  created_at: string;
  updated_at: string;
};

export type Player = {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  team: string;
  price: number;
  points: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
};