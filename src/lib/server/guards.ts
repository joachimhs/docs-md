import { error } from '@sveltejs/kit';
import { hasPermission } from './auth';
import type { AuthUser, AuthAction } from '$lib/types';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Check if a permission is satisfied. Returns null if allowed,
 * or an error object { status, message } if denied.
 * Used in tests where we can't throw SvelteKit errors.
 */
export function checkPermission(
  authEnabled: boolean,
  user: AuthUser | null,
  action: AuthAction
): { status: number; message: string } | null {
  if (!authEnabled) return null;

  if (!user) {
    return { status: 401, message: 'Authentication required' };
  }

  if (!hasPermission(user.role, action)) {
    return { status: 403, message: `Insufficient permissions: ${action} requires a higher role` };
  }

  return null;
}

/**
 * Guard an API route. Throws a SvelteKit error if the user
 * lacks permission. No-op when auth is disabled.
 */
export function requirePermission(event: RequestEvent, action: AuthAction): void {
  const result = checkPermission(event.locals.authEnabled, event.locals.user, action);
  if (result) {
    throw error(result.status, result.message);
  }
}
