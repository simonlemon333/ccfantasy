// @ts-nocheck
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('Starting RLS fix for lineups table...');

    // Drop existing overly restrictive policy
    const dropLineupsPolicyQuery = `DROP POLICY IF EXISTS "Users can view own lineups" ON public.lineups;`;
    
    // Create separate policies for different operations
    const createLineupsSelectPolicy = `
      CREATE POLICY "Users can select own lineups" ON public.lineups
          FOR SELECT USING (auth.uid() = user_id);
    `;
    
    const createLineupsInsertPolicy = `
      CREATE POLICY "Users can insert own lineups" ON public.lineups
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    `;
    
    const createLineupsUpdatePolicy = `
      CREATE POLICY "Users can update own lineups" ON public.lineups
          FOR UPDATE USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
    `;
    
    const createLineupsDeletePolicy = `
      CREATE POLICY "Users can delete own lineups" ON public.lineups
          FOR DELETE USING (auth.uid() = user_id);
    `;

    // Fix lineup_players policies as well
    const dropLineupPlayersPolicy = `DROP POLICY IF EXISTS "Users can view own lineup players" ON public.lineup_players;`;
    
    const createLineupPlayersSelectPolicy = `
      CREATE POLICY "Users can select own lineup players" ON public.lineup_players
          FOR SELECT USING (
              lineup_id IN (
                  SELECT id FROM public.lineups WHERE user_id = auth.uid()
              )
          );
    `;
    
    const createLineupPlayersInsertPolicy = `
      CREATE POLICY "Users can insert own lineup players" ON public.lineup_players
          FOR INSERT WITH CHECK (
              lineup_id IN (
                  SELECT id FROM public.lineups WHERE user_id = auth.uid()
              )
          );
    `;
    
    const createLineupPlayersUpdatePolicy = `
      CREATE POLICY "Users can update own lineup players" ON public.lineup_players
          FOR UPDATE USING (
              lineup_id IN (
                  SELECT id FROM public.lineups WHERE user_id = auth.uid()
              )
          )
          WITH CHECK (
              lineup_id IN (
                  SELECT id FROM public.lineups WHERE user_id = auth.uid()
              )
          );
    `;
    
    const createLineupPlayersDeletePolicy = `
      CREATE POLICY "Users can delete own lineup players" ON public.lineup_players
          FOR DELETE USING (
              lineup_id IN (
                  SELECT id FROM public.lineups WHERE user_id = auth.uid()
              )
          );
    `;

    // Execute all queries
    const queries = [
      dropLineupsPolicyQuery,
      createLineupsSelectPolicy,
      createLineupsInsertPolicy,
      createLineupsUpdatePolicy,
      createLineupsDeletePolicy,
      dropLineupPlayersPolicy,
      createLineupPlayersSelectPolicy,
      createLineupPlayersInsertPolicy,
      createLineupPlayersUpdatePolicy,
      createLineupPlayersDeletePolicy
    ];

    const results = [];
    for (const query of queries) {
      console.log('Executing query:', query.substring(0, 100) + '...');
      const result = await supabase.rpc('exec_sql', { sql: query });
      results.push({
        query: query.substring(0, 100) + '...',
        success: !result.error,
        error: result.error?.message || null
      });
      
      if (result.error) {
        console.error('Query failed:', result.error);
      }
    }

    // Verify the policies are working
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('schemaname, tablename, policyname, cmd, roles, qual, with_check')
      .in('tablename', ['lineups', 'lineup_players'])
      .order('tablename, policyname');

    return NextResponse.json({
      success: true,
      message: 'RLS policies updated successfully',
      results,
      verification: {
        policies: policies || [],
        error: policiesError?.message || null
      }
    });

  } catch (error: any) {
    console.error('Error fixing RLS:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix RLS policies',
      details: error.message
    }, { status: 500 });
  }
}