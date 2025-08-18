import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/debug/fix-users - Create a test user for debugging
export async function POST(request: NextRequest) {
  try {
    console.log('Starting users table creation...');

    // Since we can't access auth.users directly, let's create a test user
    // Get current authenticated user (if any)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('No authenticated user found, creating test users');
    }

    // Check existing users in public.users table
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email, username');

    if (publicError) {
      console.error('Error fetching public users:', publicError);
    }

    console.log(`Found ${publicUsers?.length || 0} users in public.users table`);

    let usersCreated = 0;
    const errors = [];

    // Create test users since we need users to exist for the foreign key relationships
    const testUsers = [
      {
        id: crypto.randomUUID(),
        email: 'test1@example.com',
        username: 'testuser1',
        display_name: 'Test User 1'
      },
      {
        id: crypto.randomUUID(),
        email: 'test2@example.com', 
        username: 'testuser2',
        display_name: 'Test User 2'
      }
    ];

    // If we have a real authenticated user, use that too
    if (user) {
      testUsers.push({
        id: user.id,
        email: user.email || 'user@example.com',
        username: user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
        display_name: user.user_metadata?.display_name || user.user_metadata?.username || null
      });
    }

    // Create test users
    for (const testUser of testUsers) {
      try {
        const existingUser = publicUsers?.find(u => u.id === testUser.id);
        
        if (!existingUser) {
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: testUser.id,
              email: testUser.email,
              username: testUser.username,
              display_name: testUser.display_name,
              avatar_url: null
            });

          if (createError) {
            console.error(`Error creating user ${testUser.id}:`, createError);
            errors.push(`Failed to create user ${testUser.email}: ${createError.message}`);
          } else {
            usersCreated++;
            console.log(`Created user: ${testUser.email}`);
          }
        }
      } catch (error) {
        console.error(`Error processing user ${testUser.id}:`, error);
        errors.push(`Error processing user ${testUser.email}: ${error.message}`);
      }
    }

    // Check final count
    const { data: finalUsers, error: finalError } = await supabase
      .from('users')
      .select('id, email, username')
      .limit(100);

    return NextResponse.json({
      success: true,
      data: {
        testUsersCreated: usersCreated,
        publicUsersFound: publicUsers?.length || 0,
        finalUserCount: finalUsers?.length || 0,
        testUsers: testUsers.map(u => ({ id: u.id, email: u.email, username: u.username })),
        errors
      },
      message: `Test users created: ${usersCreated} users added for testing`
    });

  } catch (error) {
    console.error('Users fix error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fix users table'
    }, { status: 500 });
  }
}