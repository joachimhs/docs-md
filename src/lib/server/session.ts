import { createHmac, randomBytes } from 'node:crypto';
import type { AuthUser } from '$lib/types';

/**
 * Create a signed session token containing user data.
 * Format: base64url(payload).base64url(hmac-sha256)
 * Payload includes expiry (default 7 days).
 */
export function createSessionToken(
  user: AuthUser,
  secret: string,
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000
): string {
  const payload = {
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    exp: Date.now() + maxAgeMs,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(payloadB64).digest('base64url');

  return `${payloadB64}.${sig}`;
}

/**
 * Validate a session token and return the user if valid.
 * Returns null if the token is invalid, tampered, or expired.
 */
export function validateSessionToken(token: string, secret: string): AuthUser | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sig] = parts;

  // Verify signature
  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  if (sig !== expectedSig) return null;

  // Decode payload
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    // Check expiry
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;

    return {
      email: payload.email,
      name: payload.name,
      role: payload.role,
      avatar: payload.avatar,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a random session secret (used when none is configured).
 */
export function generateSecret(): string {
  return randomBytes(32).toString('base64url');
}
