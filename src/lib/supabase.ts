import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// For development/learning, we'll use environment variables
// In production, these should be properly secured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

// Create the Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Export types for convenience
export type { Database } from './database.types';