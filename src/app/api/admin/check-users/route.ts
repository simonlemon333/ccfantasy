// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/admin/check-users - 查看用户数据
export async function GET(request: NextRequest) {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, display_name, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('查询用户失败:', error);
      return NextResponse.json({
        success: false,
        error: `查询用户失败: ${error.message}`
      }, { status: 500 });
    }

    // 也检查 Supabase Auth 用户
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: users?.length || 0,
        users: users?.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email || '未设置',
          display_name: u.display_name || u.username,
          created_at: u.created_at
        })),
        authUsers: authUsers?.users?.map(au => ({
          id: au.id,
          email: au.email,
          created_at: au.created_at
        })) || []
      }
    });

  } catch (error) {
    console.error('检查用户错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '检查用户失败'
    }, { status: 500 });
  }
}