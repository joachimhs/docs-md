import { describe, it, expect } from 'vitest';
import { hasPermission, resolveRole } from '$lib/server/auth';

describe('hasPermission', () => {
  it('viewer can only read', () => {
    expect(hasPermission('viewer', 'read')).toBe(true);
    expect(hasPermission('viewer', 'edit')).toBe(false);
    expect(hasPermission('viewer', 'commit')).toBe(false);
    expect(hasPermission('viewer', 'push')).toBe(false);
    expect(hasPermission('viewer', 'admin')).toBe(false);
  });

  it('editor can read, edit, and commit', () => {
    expect(hasPermission('editor', 'read')).toBe(true);
    expect(hasPermission('editor', 'edit')).toBe(true);
    expect(hasPermission('editor', 'commit')).toBe(true);
    expect(hasPermission('editor', 'push')).toBe(false);
    expect(hasPermission('editor', 'admin')).toBe(false);
  });

  it('admin can do everything', () => {
    expect(hasPermission('admin', 'read')).toBe(true);
    expect(hasPermission('admin', 'edit')).toBe(true);
    expect(hasPermission('admin', 'commit')).toBe(true);
    expect(hasPermission('admin', 'push')).toBe(true);
    expect(hasPermission('admin', 'admin')).toBe(true);
  });

  it('undefined role can only read', () => {
    expect(hasPermission(undefined, 'read')).toBe(true);
    expect(hasPermission(undefined, 'edit')).toBe(false);
  });
});

describe('resolveRole', () => {
  it('returns admin when email is in admin list', () => {
    const roles = { admin: ['alice@example.com'], editor: [] };
    expect(resolveRole('alice@example.com', 'viewer', roles)).toBe('admin');
  });

  it('returns editor when email is in editor list', () => {
    const roles = { admin: [], editor: ['bob@example.com'] };
    expect(resolveRole('bob@example.com', 'viewer', roles)).toBe('editor');
  });

  it('returns default role when not in any list', () => {
    const roles = { admin: [], editor: [] };
    expect(resolveRole('nobody@example.com', 'viewer', roles)).toBe('viewer');
  });

  it('admin takes precedence over editor', () => {
    const roles = { admin: ['both@example.com'], editor: ['both@example.com'] };
    expect(resolveRole('both@example.com', 'viewer', roles)).toBe('admin');
  });
});
