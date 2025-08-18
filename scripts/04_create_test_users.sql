-- Create test users to fix foreign key relationships
-- Run this in Supabase SQL Editor

-- Temporarily disable RLS for users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Insert test users
INSERT INTO users (id, email, username, display_name, created_at, updated_at) VALUES 
  (gen_random_uuid(), 'test1@example.com', 'testuser1', 'Test User 1', now(), now()),
  (gen_random_uuid(), 'test2@example.com', 'testuser2', 'Test User 2', now(), now()),
  (gen_random_uuid(), 'admin@example.com', 'admin', 'Admin User', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Re-enable RLS for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Update users table to allow authenticated users to read/write their own data
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create proper RLS policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow service role to manage all users (for admin operations)
CREATE POLICY "Service role can manage all users" ON users FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Check the users we created
SELECT id, email, username, display_name FROM users;