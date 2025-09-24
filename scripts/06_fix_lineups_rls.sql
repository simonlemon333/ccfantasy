-- Fix RLS policies for lineups table to allow proper INSERT/UPDATE operations
-- Run this in Supabase SQL Editor to fix the submission blocking issue

-- First, drop existing overly restrictive policy
DROP POLICY IF EXISTS "Users can view own lineups" ON public.lineups;

-- Create separate policies for different operations
-- 1. SELECT: Users can view their own lineups
CREATE POLICY "Users can select own lineups" ON public.lineups
    FOR SELECT USING (auth.uid() = user_id);

-- 2. INSERT: Users can create lineups for themselves
CREATE POLICY "Users can insert own lineups" ON public.lineups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Users can update their own lineups
CREATE POLICY "Users can update own lineups" ON public.lineups
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. DELETE: Users can delete their own lineups
CREATE POLICY "Users can delete own lineups" ON public.lineups
    FOR DELETE USING (auth.uid() = user_id);

-- Fix lineup_players policies as well
DROP POLICY IF EXISTS "Users can view own lineup players" ON public.lineup_players;

-- Create separate policies for lineup_players
-- 1. SELECT: Users can view players in their lineups
CREATE POLICY "Users can select own lineup players" ON public.lineup_players
    FOR SELECT USING (
        lineup_id IN (
            SELECT id FROM public.lineups WHERE user_id = auth.uid()
        )
    );

-- 2. INSERT: Users can add players to their lineups
CREATE POLICY "Users can insert own lineup players" ON public.lineup_players
    FOR INSERT WITH CHECK (
        lineup_id IN (
            SELECT id FROM public.lineups WHERE user_id = auth.uid()
        )
    );

-- 3. UPDATE: Users can update players in their lineups
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

-- 4. DELETE: Users can remove players from their lineups
CREATE POLICY "Users can delete own lineup players" ON public.lineup_players
    FOR DELETE USING (
        lineup_id IN (
            SELECT id FROM public.lineups WHERE user_id = auth.uid()
        )
    );

-- Verify the policies are working
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename IN ('lineups', 'lineup_players')
ORDER BY tablename, policyname;