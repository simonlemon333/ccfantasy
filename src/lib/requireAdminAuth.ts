import { NextResponse } from 'next/server';
import { requireAuth } from './requireAuth';

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);

/**
 * Validate the user is authenticated AND is an admin.
 * Returns 401 for missing/invalid token, 403 for non-admin users.
 */
export async function requireAdminAuth(request: Request): Promise<
  { user: { id: string; email: string }; error?: never } |
  { user?: never; error: NextResponse }
> {
  const result = await requireAuth(request);
  if (result.error) return result;

  if (ADMIN_USER_IDS.length === 0) {
    return {
      error: NextResponse.json(
        { success: false, error: 'ADMIN_USER_IDS not configured' },
        { status: 500 }
      ),
    };
  }

  if (!ADMIN_USER_IDS.includes(result.user.id)) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Forbidden: admin access required' },
        { status: 403 }
      ),
    };
  }

  return result;
}
