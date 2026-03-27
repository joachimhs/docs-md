import { describe, it, expect } from 'vitest';
import { checkPermission } from '$lib/server/guards';

describe('checkPermission', () => {
  it('allows anything when auth is disabled', () => {
    const result = checkPermission(false, null, 'push');
    expect(result).toBeNull(); // null = allowed
  });

  it('returns 401 when auth enabled and no user', () => {
    const result = checkPermission(true, null, 'edit');
    expect(result).toEqual({ status: 401, message: 'Authentication required' });
  });

  it('returns 403 when user lacks permission', () => {
    const user = { email: 'a@b.com', name: 'A', role: 'viewer' as const };
    const result = checkPermission(true, user, 'edit');
    expect(result).toEqual({ status: 403, message: expect.stringContaining('Insufficient permissions') });
  });

  it('allows when user has permission', () => {
    const user = { email: 'a@b.com', name: 'A', role: 'editor' as const };
    const result = checkPermission(true, user, 'edit');
    expect(result).toBeNull();
  });

  it('blocks editor from pushing', () => {
    const user = { email: 'a@b.com', name: 'A', role: 'editor' as const };
    const result = checkPermission(true, user, 'push');
    expect(result).toEqual({ status: 403, message: expect.stringContaining('Insufficient permissions') });
  });
});
