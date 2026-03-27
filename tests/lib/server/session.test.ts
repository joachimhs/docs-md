import { describe, it, expect } from 'vitest';
import { createSessionToken, validateSessionToken } from '$lib/server/session';
import type { AuthUser } from '$lib/types';

describe('session tokens', () => {
  const secret = 'test-secret-key-at-least-32-characters-long!!';
  const user: AuthUser = { email: 'alice@example.com', name: 'Alice', role: 'admin' };

  it('creates a token that can be validated', () => {
    const token = createSessionToken(user, secret);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);

    const result = validateSessionToken(token, secret);
    expect(result).not.toBeNull();
    expect(result!.email).toBe('alice@example.com');
    expect(result!.name).toBe('Alice');
    expect(result!.role).toBe('admin');
  });

  it('returns null for invalid token', () => {
    const result = validateSessionToken('garbage', secret);
    expect(result).toBeNull();
  });

  it('returns null for tampered token', () => {
    const token = createSessionToken(user, secret);
    const tampered = token.slice(0, -5) + 'XXXXX';
    const result = validateSessionToken(tampered, secret);
    expect(result).toBeNull();
  });

  it('returns null for expired token', () => {
    const token = createSessionToken(user, secret, -1000); // Expired 1 second ago
    const result = validateSessionToken(token, secret);
    expect(result).toBeNull();
  });
});
