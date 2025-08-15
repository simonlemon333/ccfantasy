-- Enable Supabase Auth and fix user tables
-- Run this in Supabase SQL Editor

-- First, enable email confirmation (optional - set to false for testing)
-- This can be changed in Supabase Dashboard > Authentication > Settings
-- For now we'll disable email confirmation for easier testing

-- Create a trigger to automatically create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, display_name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 
          COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
          COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
          NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to work with real auth
-- First, enable RLS on tables that need it
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineup_players ENABLE ROW LEVEL SECURITY;

-- Update users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR ALL USING (auth.uid() = id);

-- Update lineups policies  
DROP POLICY IF EXISTS "Users can view own lineups" ON public.lineups;
CREATE POLICY "Users can view own lineups" ON public.lineups
    FOR ALL USING (auth.uid() = user_id);

-- Update lineup_players policies
DROP POLICY IF EXISTS "Users can view own lineup players" ON public.lineup_players;
CREATE POLICY "Users can view own lineup players" ON public.lineup_players
    FOR ALL USING (
        lineup_id IN (
            SELECT id FROM public.lineups WHERE user_id = auth.uid()
        )
    );

-- For rooms and room_members, disable RLS for now to avoid infinite recursion
-- We'll implement proper policies later
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members DISABLE ROW LEVEL SECURITY;

-- Make sure public tables are readable for logged-in users
-- These tables should be readable by all authenticated users
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixtures DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_events DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT ON public.teams TO authenticated;
GRANT SELECT ON public.players TO authenticated;
GRANT SELECT ON public.fixtures TO authenticated;
GRANT SELECT ON public.player_events TO authenticated;

-- Grant full access to users' own data
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.lineups TO authenticated;
GRANT ALL ON public.lineup_players TO authenticated;
GRANT ALL ON public.rooms TO authenticated;
GRANT ALL ON public.room_members TO authenticated;