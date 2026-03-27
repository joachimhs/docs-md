import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import yaml from 'js-yaml';
import bcrypt from 'bcryptjs';
import { loadConfig, DOCS_ROOT } from './config';
import type { AuthUser, AuthRole, AuthAction, SimpleAuthUser } from '$lib/types';

/**
 * Check if authentication is enabled in config.
 */
export function isAuthEnabled(): boolean {
  const config = loadConfig();
  return config.auth?.enabled === true;
}

/**
 * Get the current auth mode.
 */
export function getAuthMode(): 'simple' | 'oauth' | 'none' {
  const config = loadConfig();
  if (!config.auth?.enabled) return 'none';
  return config.auth.mode || 'simple';
}

/**
 * Validate email + password against the users file (simple auth mode).
 */
export async function validateSimpleAuth(email: string, password: string): Promise<AuthUser | null> {
  const config = loadConfig();
  const usersFile = resolve(DOCS_ROOT, config.auth?.simple?.users_file || '.docsmd-users.yml');

  if (!existsSync(usersFile)) return null;

  const raw = readFileSync(usersFile, 'utf8');
  const data = yaml.load(raw) as { users: SimpleAuthUser[] } | null;

  if (!data?.users) return null;

  const user = data.users.find(u => u.email === email);
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  const roles = config.auth?.roles || { admin: [], editor: [] };

  return {
    email: user.email,
    name: user.name,
    role: resolveRole(user.email, user.role, roles),
  };
}

/**
 * Resolve a user's effective role. Config role assignments override per-user roles.
 */
export function resolveRole(
  email: string,
  defaultRole: AuthRole,
  roles: { admin: string[]; editor: string[] }
): AuthRole {
  if (roles.admin?.includes(email)) return 'admin';
  if (roles.editor?.includes(email)) return 'editor';
  return defaultRole;
}

/**
 * Check if a role has permission for a given action.
 */
export function hasPermission(role: AuthRole | undefined, action: AuthAction): boolean {
  if (!role) return action === 'read';

  const permissions: Record<AuthRole, AuthAction[]> = {
    viewer: ['read'],
    editor: ['read', 'edit', 'commit'],
    admin: ['read', 'edit', 'commit', 'push', 'admin'],
  };

  return permissions[role]?.includes(action) || false;
}

/**
 * Get the session secret, auto-generating one if not configured.
 */
let runtimeSecret: string | null = null;

export function getSessionSecret(): string {
  const config = loadConfig();
  const configuredSecret =
    process.env.DOCSMD_SESSION_SECRET ||
    config.auth?.simple?.session_secret;

  if (configuredSecret) return configuredSecret;

  // Auto-generate a runtime secret (lost on restart)
  if (!runtimeSecret) {
    runtimeSecret = randomBytes(32).toString('base64url');
    console.log('[auth] No session secret configured — generated ephemeral secret (sessions will not survive restarts)');
  }

  return runtimeSecret;
}
