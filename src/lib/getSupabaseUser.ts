import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Extracts the Bearer token from the request and returns a per-request
 * Supabase client that uses that token for Authorization headers.
 * On failure returns an object with `error: NextResponse` which can be
 * returned directly from the caller.
 */
export async function getSupabaseUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader || null;
  if (!token) {
    return {
      error: NextResponse.json({ success: false, error: 'Missing Authorization token in request' }, { status: 401 })
    };
  }

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }
  );

  return { supabaseUser, token };
}
