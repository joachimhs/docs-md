# Phase 4 — Hosted Mode & Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add static site export, authentication (simple password + OAuth), role-based access control, Docker packaging, SSE live reload, and extended configuration — making docsmd production-ready for teams.

**Architecture:** Authentication is layered via a SvelteKit server hook (`hooks.server.ts`) that reads session cookies on every request. A guards module protects write API routes. Static export uses a build-time adapter swap. Docker wraps the Node build. SSE provides real-time file change notifications to browsers.

**Tech Stack:** arctic (OAuth), bcryptjs (password hashing), cookie (parsing), @sveltejs/adapter-static (static export), chokidar (already installed), SvelteKit hooks

**Spec:** `PHASE-4-HOSTED-AND-AUTH.md`. All refs to "specmd" in spec are "docsmd" in our codebase (env vars `DOCSMD_*`, config `.docsmd.yml`).

---

## File Structure

### New Files
```
src/lib/server/auth.ts                    # Auth logic: validate credentials, resolve roles, check permissions
src/lib/server/session.ts                 # Session creation/validation using signed cookies (HMAC)
src/lib/server/guards.ts                  # Permission guard helper for API routes
src/hooks.server.ts                       # SvelteKit server hook: session parsing on every request
src/routes/auth/login/+page.svelte        # Login page (password form or OAuth button)
src/routes/auth/login/+page.server.ts     # Login page server load (auth mode detection)
src/routes/auth/login/+page.server.ts     # Login POST handler (simple auth)
src/routes/auth/callback/+server.ts       # OAuth callback handler
src/routes/auth/logout/+server.ts         # Logout (clear session cookie)
src/routes/api/health/+server.ts          # Health check endpoint
src/routes/api/events/+server.ts          # SSE endpoint for live file change notifications
src/lib/components/UserMenu.svelte        # Header: avatar/name/role + logout (or "Sign in")
src/lib/components/LoginPrompt.svelte     # Inline prompt when unauthenticated user clicks Edit
cli/commands/build.ts                     # CLI `docsmd build` command (static + node builds)
cli/commands/user.ts                      # CLI `docsmd user add` command
Dockerfile                                # Production Docker image
docker-compose.yml                        # Example Docker Compose for users
```

### Modified Files
```
svelte.config.js                          # Dual adapter support (node/static)
package.json                              # New dependencies, build:static script
src/lib/types/index.ts                    # Auth types, extended DocsMDConfig
src/lib/server/config.ts                  # Load auth/hosting config, env var overrides
src/lib/server/watcher.ts                 # Notify SSE clients on file changes
src/routes/+layout.server.ts              # Pass auth state to client
src/routes/+layout.svelte                 # Show UserMenu, hide write UI for viewers/static
src/routes/doc/[...path]/+page.svelte     # Permission-aware Edit/History buttons
src/routes/doc/[...path]/+page.server.ts  # Add prerender support for static builds
src/routes/api/docs/+server.ts            # Add permission guards on POST
src/routes/api/docs/[id]/+server.ts       # Add permission guards on PUT/DELETE
src/routes/api/git/commit/+server.ts      # Add permission guard
src/routes/api/git/push/+server.ts        # Add permission guard
cli/index.ts                              # Register build and user commands
```

---

## Task 1: Install Dependencies & Extend Types

**Files:**
- Modify: `specmd/package.json`
- Modify: `specmd/src/lib/types/index.ts`

- [ ] **Step 1: Install new dependencies**

```bash
cd /Users/joachimhaagenskeie/Projects/claude/specMD/specmd
npm install arctic cookie bcryptjs
npm install -D @sveltejs/adapter-static @types/bcryptjs @types/cookie
```

- [ ] **Step 2: Extend type definitions**

Add auth types to `src/lib/types/index.ts`:

```typescript
// --- Auth types (Phase 4) ---

/** Authenticated user */
export interface AuthUser {
  email: string;
  name: string;
  role: 'viewer' | 'editor' | 'admin';
  avatar?: string;
}

/** Role type */
export type AuthRole = 'viewer' | 'editor' | 'admin';

/** Permission actions */
export type AuthAction = 'read' | 'edit' | 'commit' | 'push' | 'admin';

/** Simple auth user entry from .docsmd-users.yml */
export interface SimpleAuthUser {
  email: string;
  name: string;
  password_hash: string;
  role: AuthRole;
}

/** Auth configuration within DocsMDConfig */
export interface AuthConfig {
  enabled: boolean;
  mode: 'simple' | 'oauth';
  public_read: boolean;
  simple: {
    users_file: string;
    session_secret: string;
  };
  oauth: {
    provider: 'github' | 'gitlab' | 'google';
    client_id: string;
    client_secret: string;
    allowed_domains: string[];
    default_role: AuthRole;
  };
  roles: {
    admin: string[];
    editor: string[];
  };
}

/** Hosting configuration within DocsMDConfig */
export interface HostingConfig {
  adapter: 'node' | 'static';
  base_path: string;
}
```

Update the `DocsMDConfig` interface to include auth and hosting:

```typescript
export interface DocsMDConfig {
  spec_version: string;
  project: {
    name: string;
    description?: string;
    logo?: string;
  };
  types: Record<string, DocTypeConfig>;
  search?: {
    fuzzy_threshold?: number;
    result_limit?: number;
    snippet_length?: number;
  };
  ui?: {
    theme?: 'light' | 'dark' | 'auto';
    sidebar_default?: 'expanded' | 'collapsed';
    default_editor?: 'richtext' | 'markdown';
  };
  auth?: AuthConfig;
  hosting?: HostingConfig;
}
```

- [ ] **Step 3: Add SvelteKit app.d.ts locals types**

Create or update `src/app.d.ts`:

```typescript
import type { AuthUser } from '$lib/types';

declare global {
  namespace App {
    interface Locals {
      user: AuthUser | null;
      authEnabled: boolean;
    }
  }
}

export {};
```

- [ ] **Step 4: Verify types compile**

```bash
cd /Users/joachimhaagenskeie/Projects/claude/specMD/specmd
npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/types/index.ts src/app.d.ts
git commit -m "feat(phase4): add auth dependencies and type definitions"
```

---

## Task 2: Extend Configuration Loading

**Files:**
- Modify: `specmd/src/lib/server/config.ts`
- Test: `specmd/tests/lib/server/config.test.ts`

- [ ] **Step 1: Write failing test for auth config loading**

Add to `tests/lib/server/config.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { loadConfig } from '$lib/server/config';

describe('auth config defaults', () => {
  it('returns auth disabled by default', () => {
    const config = loadConfig();
    expect(config.auth).toBeDefined();
    expect(config.auth!.enabled).toBe(false);
    expect(config.auth!.mode).toBe('simple');
    expect(config.auth!.public_read).toBe(true);
  });

  it('returns hosting defaults', () => {
    const config = loadConfig();
    expect(config.hosting).toBeDefined();
    expect(config.hosting!.adapter).toBe('node');
    expect(config.hosting!.base_path).toBe('/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/joachimhaagenskeie/Projects/claude/specMD/specmd
npx vitest run tests/lib/server/config.test.ts
```
Expected: FAIL — `config.auth` is undefined

- [ ] **Step 3: Update config.ts with auth and hosting defaults + env overrides**

Update `src/lib/server/config.ts` — add default auth and hosting config to `loadConfig()`:

```typescript
import { env } from '$env/dynamic/private';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import yaml from 'js-yaml';
import type { DocsMDConfig, DocTypeConfig, AuthConfig, HostingConfig } from '$lib/types';

export const REPO_ROOT = env.DOCSMD_REPO_ROOT || process.env.DOCSMD_REPO_ROOT || process.cwd();

const docsDir = env.DOCSMD_DOCS_DIR || process.env.DOCSMD_DOCS_DIR || 'docs';
export const DOCS_ROOT = resolve(REPO_ROOT, docsDir);

// ... (keep DEFAULT_TYPES unchanged) ...

const DEFAULT_AUTH: AuthConfig = {
  enabled: false,
  mode: 'simple',
  public_read: true,
  simple: {
    users_file: '.docsmd-users.yml',
    session_secret: '',
  },
  oauth: {
    provider: 'github',
    client_id: '',
    client_secret: '',
    allowed_domains: [],
    default_role: 'viewer',
  },
  roles: {
    admin: [],
    editor: [],
  },
};

const DEFAULT_HOSTING: HostingConfig = {
  adapter: 'node',
  base_path: '/',
};

export function loadConfig(): DocsMDConfig {
  const configPath = resolve(DOCS_ROOT, '.docsmd.yml');
  let userConfig: Partial<DocsMDConfig> = {};

  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, 'utf8');
    userConfig = (yaml.load(raw) as Partial<DocsMDConfig>) || {};
  }

  // Build auth config with env var overrides
  const authConfig: AuthConfig = {
    ...DEFAULT_AUTH,
    ...userConfig.auth,
    simple: {
      ...DEFAULT_AUTH.simple,
      ...userConfig.auth?.simple,
      session_secret:
        process.env.DOCSMD_SESSION_SECRET ||
        userConfig.auth?.simple?.session_secret ||
        DEFAULT_AUTH.simple.session_secret,
    },
    oauth: {
      ...DEFAULT_AUTH.oauth,
      ...userConfig.auth?.oauth,
      client_id:
        process.env.DOCSMD_OAUTH_CLIENT_ID ||
        userConfig.auth?.oauth?.client_id ||
        DEFAULT_AUTH.oauth.client_id,
      client_secret:
        process.env.DOCSMD_OAUTH_CLIENT_SECRET ||
        userConfig.auth?.oauth?.client_secret ||
        DEFAULT_AUTH.oauth.client_secret,
    },
    roles: {
      ...DEFAULT_AUTH.roles,
      ...userConfig.auth?.roles,
    },
  };

  const hostingConfig: HostingConfig = {
    ...DEFAULT_HOSTING,
    ...userConfig.hosting,
    adapter:
      (process.env.DOCSMD_ADAPTER as 'node' | 'static') ||
      userConfig.hosting?.adapter ||
      DEFAULT_HOSTING.adapter,
    base_path:
      process.env.DOCSMD_BASE_PATH ||
      userConfig.hosting?.base_path ||
      DEFAULT_HOSTING.base_path,
  };

  return {
    spec_version: userConfig.spec_version || '0.1.0',
    project: {
      name: userConfig.project?.name || 'Documentation',
      description: userConfig.project?.description,
      logo: userConfig.project?.logo,
    },
    types: { ...DEFAULT_TYPES, ...userConfig.types },
    search: {
      fuzzy_threshold: 0.6,
      result_limit: 50,
      snippet_length: 200,
      ...userConfig.search,
    },
    ui: {
      theme: 'auto',
      sidebar_default: 'expanded',
      default_editor: 'richtext',
      ...userConfig.ui,
    },
    auth: authConfig,
    hosting: hostingConfig,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/server/config.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/config.ts tests/lib/server/config.test.ts
git commit -m "feat(phase4): extend config with auth and hosting defaults + env overrides"
```

---

## Task 3: Session Management

**Files:**
- Create: `specmd/src/lib/server/session.ts`
- Test: `specmd/tests/lib/server/session.test.ts`

- [ ] **Step 1: Write failing test for session creation and validation**

Create `tests/lib/server/session.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/server/session.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement session module**

Create `src/lib/server/session.ts`:

```typescript
import { createHmac, randomBytes } from 'node:crypto';
import type { AuthUser } from '$lib/types';

/**
 * Create a signed session token containing user data.
 * Format: base64(payload).base64(hmac-sha256)
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/server/session.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/session.ts tests/lib/server/session.test.ts
git commit -m "feat(phase4): add session token creation and validation"
```

---

## Task 4: Auth Logic (Validate Credentials, Roles, Permissions)

**Files:**
- Create: `specmd/src/lib/server/auth.ts`
- Test: `specmd/tests/lib/server/auth.test.ts`

- [ ] **Step 1: Write failing test for permission checking**

Create `tests/lib/server/auth.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/server/auth.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement auth module**

Create `src/lib/server/auth.ts`:

```typescript
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
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
 * In production, this should be set via DOCSMD_SESSION_SECRET env var.
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
    const { randomBytes } = require('node:crypto');
    runtimeSecret = randomBytes(32).toString('base64url');
    console.log('[auth] No session secret configured — generated ephemeral secret (sessions will not survive restarts)');
  }

  return runtimeSecret;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/server/auth.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/auth.ts tests/lib/server/auth.test.ts
git commit -m "feat(phase4): add auth logic — permissions, role resolution, simple auth validation"
```

---

## Task 5: Permission Guards

**Files:**
- Create: `specmd/src/lib/server/guards.ts`
- Test: `specmd/tests/lib/server/guards.test.ts`

- [ ] **Step 1: Write failing test for permission guards**

Create `tests/lib/server/guards.test.ts`:

```typescript
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

  it('blocks viewer from pushing', () => {
    const user = { email: 'a@b.com', name: 'A', role: 'editor' as const };
    const result = checkPermission(true, user, 'push');
    expect(result).toEqual({ status: 403, message: expect.stringContaining('Insufficient permissions') });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/server/guards.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement guards module**

Create `src/lib/server/guards.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/server/guards.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/guards.ts tests/lib/server/guards.test.ts
git commit -m "feat(phase4): add permission guard for API route protection"
```

---

## Task 6: Server Hook (Session Middleware)

**Files:**
- Create: `specmd/src/hooks.server.ts`

- [ ] **Step 1: Create the server hook**

Create `src/hooks.server.ts`:

```typescript
import type { Handle } from '@sveltejs/kit';
import { isAuthEnabled } from '$lib/server/auth';
import { validateSessionToken } from '$lib/server/session';
import { getSessionSecret } from '$lib/server/auth';
import { parse } from 'cookie';

export const handle: Handle = async ({ event, resolve }) => {
  const authEnabled = isAuthEnabled();
  event.locals.authEnabled = authEnabled;

  if (!authEnabled) {
    event.locals.user = null;
    return resolve(event);
  }

  // Parse session cookie
  const cookieHeader = event.request.headers.get('cookie') || '';
  const cookies = parse(cookieHeader);
  const sessionToken = cookies['docsmd-session'];

  if (sessionToken) {
    const secret = getSessionSecret();
    const user = validateSessionToken(sessionToken, secret);
    event.locals.user = user;
  } else {
    event.locals.user = null;
  }

  return resolve(event);
};
```

- [ ] **Step 2: Verify the app still builds**

```bash
cd /Users/joachimhaagenskeie/Projects/claude/specMD/specmd
npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks.server.ts
git commit -m "feat(phase4): add server hook for session cookie parsing"
```

---

## Task 7: Protect API Routes

**Files:**
- Modify: `specmd/src/routes/api/docs/+server.ts`
- Modify: `specmd/src/routes/api/docs/[id]/+server.ts`
- Modify: `specmd/src/routes/api/git/commit/+server.ts`
- Modify: `specmd/src/routes/api/git/push/+server.ts`

- [ ] **Step 1: Add guard to POST /api/docs (create document)**

In `src/routes/api/docs/+server.ts`, add the import and guard:

```typescript
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getManifest } from '$lib/server/manifest';
import { createDocument } from '$lib/server/docs';
import { requirePermission } from '$lib/server/guards';

export const GET: RequestHandler = async ({ url }) => {
  // GET remains unchanged — reading is public when public_read is true
  const manifest = getManifest();
  let docs = [...manifest.documents];

  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const tag = url.searchParams.get('tag');
  const owner = url.searchParams.get('owner');

  if (type) docs = docs.filter(d => d.type === type);
  if (status) docs = docs.filter(d => d.status === status);
  if (tag) docs = docs.filter(d => d.tags.includes(tag));
  if (owner) docs = docs.filter(d => d.owner === owner);

  const sort = url.searchParams.get('sort') || 'title';
  const order = url.searchParams.get('order') || 'asc';
  docs.sort((a, b) => {
    const av = (a as any)[sort] || '';
    const bv = (b as any)[sort] || '';
    return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  return json(docs);
};

export const POST: RequestHandler = async (event) => {
  requirePermission(event, 'edit');

  const { frontmatter, body } = await event.request.json();
  if (!frontmatter?.title) {
    return json({ error: 'Title is required' }, { status: 400 });
  }
  const result = createDocument(frontmatter, body || '');
  return json(result, { status: 201 });
};
```

- [ ] **Step 2: Add guard to PUT/DELETE /api/docs/[id]**

Read the current file at `src/routes/api/docs/[id]/+server.ts` and add `requirePermission(event, 'edit')` at the top of PUT and DELETE handlers. Import `requirePermission` from `$lib/server/guards`.

- [ ] **Step 3: Add guard to POST /api/git/commit**

Update `src/routes/api/git/commit/+server.ts`:

```typescript
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { commitDocChange } from '$lib/server/git';
import { requirePermission } from '$lib/server/guards';

export const POST: RequestHandler = async (event) => {
  requirePermission(event, 'commit');

  const { message, files, author } = await event.request.json();
  if (!message) throw error(400, 'message is required');

  const docPath = files?.[0] || '';
  try {
    const result = await commitDocChange(docPath, message, author);
    return json({ hash: result.commit, message });
  } catch (e: any) {
    throw error(500, e.message || 'Commit failed');
  }
};
```

- [ ] **Step 4: Add guard to POST /api/git/push**

Update `src/routes/api/git/push/+server.ts`:

```typescript
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { pushChanges } from '$lib/server/git';
import { requirePermission } from '$lib/server/guards';

export const POST: RequestHandler = async (event) => {
  requirePermission(event, 'push');

  try {
    const result = await pushChanges();
    return json(result);
  } catch (e: any) {
    return json({ pushed: false, reason: e.message || 'Push failed' }, { status: 500 });
  }
};
```

- [ ] **Step 5: Verify the app builds**

```bash
npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json
```

- [ ] **Step 6: Commit**

```bash
git add src/routes/api/docs/+server.ts src/routes/api/docs/\[id\]/+server.ts \
  src/routes/api/git/commit/+server.ts src/routes/api/git/push/+server.ts
git commit -m "feat(phase4): add permission guards to write API routes"
```

---

## Task 8: Login Page & Auth Routes

**Files:**
- Create: `specmd/src/routes/auth/login/+page.server.ts`
- Create: `specmd/src/routes/auth/login/+page.svelte`
- Create: `specmd/src/routes/auth/callback/+server.ts`
- Create: `specmd/src/routes/auth/logout/+server.ts`

- [ ] **Step 1: Create login page server load**

Create `src/routes/auth/login/+page.server.ts`:

```typescript
import type { PageServerLoad, Actions } from './$types';
import { getAuthMode, validateSimpleAuth, getSessionSecret } from '$lib/server/auth';
import { createSessionToken } from '$lib/server/session';
import { redirect, fail } from '@sveltejs/kit';
import { loadConfig } from '$lib/server/config';
import { serialize } from 'cookie';

export const load: PageServerLoad = async ({ locals }) => {
  // Already logged in? Redirect to home
  if (locals.user) {
    throw redirect(302, '/');
  }

  const mode = getAuthMode();
  const config = loadConfig();
  const provider = config.auth?.oauth?.provider || 'github';

  return { mode, provider };
};

export const actions: Actions = {
  login: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required', email });
    }

    const user = await validateSimpleAuth(email, password);
    if (!user) {
      return fail(401, { error: 'Invalid email or password', email });
    }

    const secret = getSessionSecret();
    const token = createSessionToken(user, secret);

    cookies.set('docsmd-session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // Set to true in production behind HTTPS
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    throw redirect(302, '/');
  },
};
```

- [ ] **Step 2: Create login page UI**

Create `src/routes/auth/login/+page.svelte`:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();
</script>

<div class="login-page">
  <div class="login-card">
    <h1>Sign In</h1>

    {#if data.mode === 'simple'}
      <form method="POST" action="?/login" use:enhance>
        {#if form?.error}
          <div class="error-message">{form.error}</div>
        {/if}

        <label>
          Email
          <input
            type="email"
            name="email"
            value={form?.email ?? ''}
            required
            autocomplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            required
            autocomplete="current-password"
          />
        </label>

        <button type="submit" class="btn-primary">Sign In</button>
      </form>

    {:else if data.mode === 'oauth'}
      <a href="/auth/callback?start=1" class="btn-oauth">
        Sign in with {data.provider.charAt(0).toUpperCase() + data.provider.slice(1)}
      </a>
    {:else}
      <p>Authentication is not enabled.</p>
    {/if}

    <a href="/" class="skip-link">Continue without signing in</a>
  </div>
</div>

<style>
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
  }

  .login-card {
    width: 100%;
    max-width: 400px;
    padding: var(--spacing-xl);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg);
  }

  .login-card h1 {
    margin: 0 0 var(--spacing-lg);
    font-size: var(--text-xl);
    text-align: center;
  }

  label {
    display: block;
    margin-bottom: var(--spacing-md);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  input {
    display: block;
    width: 100%;
    margin-top: var(--spacing-xs);
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--text-base);
    background: var(--color-bg);
    color: var(--color-text);
  }

  input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: -1px;
  }

  .btn-primary {
    width: 100%;
    padding: 0.6rem;
    margin-top: var(--spacing-md);
    border: none;
    border-radius: var(--radius-sm);
    background: var(--color-accent);
    color: #fff;
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
  }

  .btn-primary:hover {
    background: var(--color-accent-hover);
  }

  .btn-oauth {
    display: block;
    width: 100%;
    padding: 0.6rem;
    text-align: center;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    color: var(--color-text);
    text-decoration: none;
    font-weight: 600;
  }

  .btn-oauth:hover {
    background: var(--color-bg-secondary);
  }

  .error-message {
    padding: var(--spacing-sm) var(--spacing-md);
    margin-bottom: var(--spacing-md);
    border-radius: var(--radius-sm);
    background: #fef2f2;
    color: #dc2626;
    font-size: var(--text-sm);
  }

  .skip-link {
    display: block;
    margin-top: var(--spacing-lg);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
</style>
```

- [ ] **Step 3: Create OAuth callback handler**

Create `src/routes/auth/callback/+server.ts`:

```typescript
import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { loadConfig } from '$lib/server/config';
import { resolveRole, getSessionSecret } from '$lib/server/auth';
import { createSessionToken } from '$lib/server/session';
import { GitHub, GitLab, Google } from 'arctic';
import { serialize } from 'cookie';

function getOAuthClient(config: ReturnType<typeof loadConfig>) {
  const oauth = config.auth?.oauth;
  if (!oauth) throw new Error('OAuth not configured');

  const origin = process.env.ORIGIN || 'http://localhost:5176';
  const callbackUrl = `${origin}/auth/callback`;

  switch (oauth.provider) {
    case 'github':
      return new GitHub(oauth.client_id, oauth.client_secret, callbackUrl);
    case 'gitlab':
      return new GitLab(oauth.client_id, oauth.client_secret, callbackUrl);
    case 'google':
      return new Google(oauth.client_id, oauth.client_secret, callbackUrl);
    default:
      throw new Error(`Unknown OAuth provider: ${oauth.provider}`);
  }
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  const config = loadConfig();
  const oauth = config.auth?.oauth;
  if (!oauth) throw redirect(302, '/');

  const client = getOAuthClient(config);

  // Step 1: If ?start=1, redirect to the provider's auth URL
  if (url.searchParams.get('start') === '1') {
    const state = crypto.randomUUID();
    cookies.set('docsmd-oauth-state', state, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 600,
    });

    const scopes = oauth.provider === 'github' ? ['user:email'] :
                   oauth.provider === 'google' ? ['openid', 'email', 'profile'] :
                   ['read_user'];

    const authUrl = client.createAuthorizationURL(state, scopes);
    throw redirect(302, authUrl.toString());
  }

  // Step 2: Handle callback with code + state
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies.get('docsmd-oauth-state');

  if (!code || !state || state !== storedState) {
    throw redirect(302, '/auth/login?error=invalid_state');
  }

  cookies.delete('docsmd-oauth-state', { path: '/' });

  try {
    const tokens = await client.validateAuthorizationCode(code);
    const accessToken = tokens.accessToken();

    // Fetch user profile based on provider
    let email = '';
    let name = '';
    let avatar = '';

    if (oauth.provider === 'github') {
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await res.json();
      name = profile.name || profile.login;
      avatar = profile.avatar_url;

      // GitHub might not include email in profile — fetch from /user/emails
      if (!profile.email) {
        const emailRes = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const emails = await emailRes.json();
        const primary = emails.find((e: any) => e.primary) || emails[0];
        email = primary?.email || '';
      } else {
        email = profile.email;
      }
    } else if (oauth.provider === 'gitlab') {
      const res = await fetch('https://gitlab.com/api/v4/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await res.json();
      email = profile.email;
      name = profile.name;
      avatar = profile.avatar_url;
    } else if (oauth.provider === 'google') {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await res.json();
      email = profile.email;
      name = profile.name;
      avatar = profile.picture;
    }

    // Check allowed domains
    if (oauth.allowed_domains.length > 0) {
      const domain = email.split('@')[1];
      if (!oauth.allowed_domains.includes(domain)) {
        throw redirect(302, '/auth/login?error=domain_not_allowed');
      }
    }

    // Resolve role
    const roles = config.auth?.roles || { admin: [], editor: [] };
    const role = resolveRole(email, oauth.default_role, roles);

    // Create session
    const user = { email, name, role, avatar };
    const secret = getSessionSecret();
    const token = createSessionToken(user, secret);

    cookies.set('docsmd-session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60,
    });

    throw redirect(302, '/');
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) throw e; // Re-throw redirects
    console.error('[auth] OAuth callback error:', e);
    throw redirect(302, '/auth/login?error=oauth_failed');
  }
};
```

- [ ] **Step 4: Create logout handler**

Create `src/routes/auth/logout/+server.ts`:

```typescript
import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ cookies }) => {
  cookies.delete('docsmd-session', { path: '/' });
  throw redirect(302, '/');
};
```

- [ ] **Step 5: Verify the app builds**

```bash
npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json
```

- [ ] **Step 6: Commit**

```bash
git add src/routes/auth/
git commit -m "feat(phase4): add login page, OAuth callback, and logout routes"
```

---

## Task 9: Auth UI Components + Layout Integration

**Files:**
- Create: `specmd/src/lib/components/UserMenu.svelte`
- Create: `specmd/src/lib/components/LoginPrompt.svelte`
- Modify: `specmd/src/routes/+layout.server.ts`
- Modify: `specmd/src/routes/+layout.svelte`
- Modify: `specmd/src/routes/doc/[...path]/+page.svelte`

- [ ] **Step 1: Pass auth state from layout server**

Update `src/routes/+layout.server.ts`:

```typescript
import type { LayoutServerLoad } from './$types';
import { getManifest } from '$lib/server/manifest';
import { loadConfig } from '$lib/server/config';
import { startWatcher } from '$lib/server/watcher';

let watcherStarted = false;

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!watcherStarted) {
    startWatcher();
    watcherStarted = true;
  }

  const manifest = getManifest();
  const config = loadConfig();

  return {
    manifest,
    config,
    user: locals.user,
    authEnabled: locals.authEnabled,
  };
};
```

- [ ] **Step 2: Create UserMenu component**

Create `src/lib/components/UserMenu.svelte`:

```svelte
<script lang="ts">
  import type { AuthUser } from '$lib/types';

  let { user, authEnabled }: { user: AuthUser | null; authEnabled: boolean } = $props();
  let menuOpen = $state(false);
</script>

{#if authEnabled}
  {#if user}
    <div class="user-menu">
      <button class="user-button" onclick={() => (menuOpen = !menuOpen)}>
        {#if user.avatar}
          <img src={user.avatar} alt="" class="user-avatar" />
        {:else}
          <span class="user-avatar-fallback">{user.name.charAt(0).toUpperCase()}</span>
        {/if}
        <span class="user-name">{user.name}</span>
        <span class="role-badge role-{user.role}">{user.role}</span>
      </button>

      {#if menuOpen}
        <div class="user-dropdown">
          <div class="dropdown-info">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <a href="/auth/logout" class="dropdown-item">Sign Out</a>
        </div>
      {/if}
    </div>
  {:else}
    <a href="/auth/login" class="btn-signin">Sign In</a>
  {/if}
{/if}

<style>
  .user-menu {
    position: relative;
  }

  .user-button {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    font-size: var(--text-sm);
  }

  .user-button:hover {
    background: var(--color-bg-secondary);
  }

  .user-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }

  .user-avatar-fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-accent);
    color: #fff;
    font-size: 12px;
    font-weight: 700;
  }

  .user-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .role-badge {
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-sm);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .role-admin { background: #fef3c7; color: #92400e; }
  .role-editor { background: #dbeafe; color: #1d4ed8; }
  .role-viewer { background: #f3f4f6; color: #6b7280; }

  .user-dropdown {
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 0.25rem;
    padding: var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    min-width: 200px;
    z-index: 200;
  }

  .dropdown-info {
    display: flex;
    flex-direction: column;
    padding: var(--spacing-sm);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--spacing-xs);
    font-size: var(--text-sm);
  }

  .dropdown-info span {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .dropdown-item {
    display: block;
    padding: var(--spacing-sm);
    color: var(--color-text);
    text-decoration: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
  }

  .dropdown-item:hover {
    background: var(--color-bg-secondary);
  }

  .btn-signin {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.65rem;
    font-size: var(--text-sm);
    font-weight: 600;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    text-decoration: none;
    white-space: nowrap;
  }

  .btn-signin:hover {
    background: var(--color-bg-secondary);
  }
</style>
```

- [ ] **Step 3: Create LoginPrompt component**

Create `src/lib/components/LoginPrompt.svelte`:

```svelte
<script lang="ts">
  let { action = 'edit' }: { action?: string } = $props();
</script>

<div class="login-prompt">
  <p>Sign in to {action} this document.</p>
  <a href="/auth/login" class="btn-signin">Sign In</a>
</div>

<style>
  .login-prompt {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg-secondary);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .login-prompt p {
    margin: 0;
  }

  .btn-signin {
    padding: 0.25rem 0.6rem;
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-sm);
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 600;
    font-size: var(--text-sm);
    white-space: nowrap;
  }

  .btn-signin:hover {
    background: var(--color-accent);
    color: #fff;
  }
</style>
```

- [ ] **Step 4: Update layout to show UserMenu and hide write UI for viewers**

In `src/routes/+layout.svelte`:

1. Import `UserMenu`
2. Add `data.user` and `data.authEnabled` from server
3. Show `UserMenu` in the header
4. Conditionally hide the "+ New" button and Push button when user lacks permissions

The key changes to the `<script>` block:

```svelte
<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';
  import { docs } from '$lib/stores/docs.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { gitState } from '$lib/stores/git.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import UserMenu from '$lib/components/UserMenu.svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
  // ... rest of existing script unchanged ...

  // Permission helpers
  function canEdit(): boolean {
    if (!data.authEnabled) return true;
    if (!data.user) return false;
    return ['editor', 'admin'].includes(data.user.role);
  }

  function canPush(): boolean {
    if (!data.authEnabled) return true;
    if (!data.user) return false;
    return data.user.role === 'admin';
  }
</script>
```

In the template, wrap the `+ New` link:

```svelte
{#if canEdit()}
  <a href="/new" class="btn-new">+ New</a>
{/if}
<UserMenu user={data.user} authEnabled={data.authEnabled} />
<ThemeToggle />
```

And wrap the Push button:

```svelte
{#if gitState.ahead > 0 && canPush()}
  <button ...>Push ↑{gitState.ahead}</button>
{/if}
```

- [ ] **Step 5: Update doc page to permission-gate Edit button**

In `src/routes/doc/[...path]/+page.svelte`, import `LoginPrompt` and conditionally show it:

After the existing doc-toolbar section, add logic:

```svelte
<script lang="ts">
  import DocHeader from '$lib/components/DocHeader.svelte';
  import TableOfContents from '$lib/components/TableOfContents.svelte';
  import BreadcrumbNav from '$lib/components/BreadcrumbNav.svelte';
  import LoginPrompt from '$lib/components/LoginPrompt.svelte';
  import { docs } from '$lib/stores/docs.svelte';
  import { page } from '$app/stores';

  let { data } = $props();
  let showRaw = $state(false);

  $effect(() => {
    docs.activeDocPath = data.document.path;
  });

  // Auth-aware: check if user can edit
  // Layout data is available via $page.data
  function canEdit(): boolean {
    const layoutData = $page.data as any;
    if (!layoutData.authEnabled) return true;
    if (!layoutData.user) return false;
    return ['editor', 'admin'].includes(layoutData.user.role);
  }
</script>
```

In the template, replace the Edit link:

```svelte
<div class="doc-toolbar">
  {#if canEdit()}
    <a href="/edit/{data.document.path.replace(/\.md$/, '')}" class="toolbar-btn">Edit</a>
  {:else if $page.data.authEnabled}
    <LoginPrompt action="edit" />
  {/if}
  <a href="/history/{data.document.path.replace(/\.md$/, '')}" class="toolbar-btn">History</a>
  <!-- ... rest unchanged ... -->
</div>
```

- [ ] **Step 6: Verify the app builds**

```bash
npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/UserMenu.svelte src/lib/components/LoginPrompt.svelte \
  src/routes/+layout.server.ts src/routes/+layout.svelte \
  src/routes/doc/\[...path\]/+page.svelte
git commit -m "feat(phase4): add auth UI — UserMenu, LoginPrompt, permission-gated buttons"
```

---

## Task 10: Health Check Endpoint

**Files:**
- Create: `specmd/src/routes/api/health/+server.ts`

- [ ] **Step 1: Create health endpoint**

Create `src/routes/api/health/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import { existsSync } from 'node:fs';
import { DOCS_ROOT } from '$lib/server/config';

export const GET = async () => {
  const docsExist = existsSync(DOCS_ROOT);
  return json({
    status: docsExist ? 'healthy' : 'degraded',
    docs_root: DOCS_ROOT,
    docs_found: docsExist,
    timestamp: new Date().toISOString(),
  });
};
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/api/health/+server.ts
git commit -m "feat(phase4): add /api/health endpoint for Docker health checks"
```

---

## Task 11: SSE Live Reload Endpoint

**Files:**
- Create: `specmd/src/routes/api/events/+server.ts`
- Modify: `specmd/src/lib/server/watcher.ts`

- [ ] **Step 1: Create the SSE events module**

Create `src/routes/api/events/+server.ts`:

```typescript
import type { RequestHandler } from './$types';

const listeners = new Set<(data: string) => void>();

/**
 * Notify all connected browser clients of a file change.
 * Called from the file watcher.
 */
export function notifyClients(event: string, data: Record<string, unknown>) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  for (const send of listeners) {
    send(payload);
  }
}

export const GET: RequestHandler = async ({ request }) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Client disconnected
          listeners.delete(send);
        }
      };

      listeners.add(send);

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          listeners.delete(send);
        }
      }, 30000);

      request.signal.addEventListener('abort', () => {
        listeners.delete(send);
        clearInterval(heartbeat);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
```

- [ ] **Step 2: Update watcher to notify SSE clients**

Update `src/lib/server/watcher.ts` to call `notifyClients` on file changes:

```typescript
import chokidar from 'chokidar';
import { DOCS_ROOT } from './config';
import { invalidateManifest } from './manifest';
import { invalidateSearchIndex } from './search';
import { resolve } from 'node:path';

let watcher: ReturnType<typeof chokidar.watch> | null = null;
let reindexTimer: ReturnType<typeof setTimeout> | null = null;

// Lazy-loaded SSE notifier to avoid circular imports
let notifyFn: ((event: string, data: Record<string, unknown>) => void) | null = null;

export function setNotifyFn(fn: (event: string, data: Record<string, unknown>) => void) {
  notifyFn = fn;
}

export function startWatcher() {
  if (watcher) return;

  watcher = chokidar.watch(resolve(DOCS_ROOT, '**/*.md'), {
    ignoreInitial: true,
    ignored: [
      '**/node_modules/**',
      '**/_archive/**',
    ],
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  const handleChange = (path: string) => {
    console.log(`[watcher] File changed: ${path}`);
    invalidateManifest();
    debounceReindex();
    notifyFn?.('docs-changed', { path });
  };

  watcher.on('add', handleChange);
  watcher.on('change', handleChange);
  watcher.on('unlink', handleChange);
}

function debounceReindex() {
  if (reindexTimer) clearTimeout(reindexTimer);
  reindexTimer = setTimeout(() => {
    invalidateSearchIndex();
    console.log('[watcher] Manifest and search index invalidated');
  }, 500);
}

export function stopWatcher() {
  watcher?.close();
  watcher = null;
}
```

- [ ] **Step 3: Wire up notifyFn in layout server load**

Update `src/routes/+layout.server.ts` to set the notify function on startup:

```typescript
import type { LayoutServerLoad } from './$types';
import { getManifest } from '$lib/server/manifest';
import { loadConfig } from '$lib/server/config';
import { startWatcher, setNotifyFn } from '$lib/server/watcher';
import { notifyClients } from './api/events/+server';

let watcherStarted = false;

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!watcherStarted) {
    setNotifyFn(notifyClients);
    startWatcher();
    watcherStarted = true;
  }

  const manifest = getManifest();
  const config = loadConfig();

  return {
    manifest,
    config,
    user: locals.user,
    authEnabled: locals.authEnabled,
  };
};
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/events/+server.ts src/lib/server/watcher.ts src/routes/+layout.server.ts
git commit -m "feat(phase4): add SSE live reload — watcher notifies browser clients on file changes"
```

---

## Task 12: Static Site Export

**Files:**
- Modify: `specmd/svelte.config.js`
- Modify: `specmd/package.json`
- Modify: `specmd/src/routes/doc/[...path]/+page.server.ts`

- [ ] **Step 1: Update svelte.config.js to support dual adapters**

```javascript
import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const useStatic = process.env.DOCSMD_ADAPTER === 'static';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: useStatic
      ? adapterStatic({
          pages: 'build-static',
          assets: 'build-static',
          fallback: '404.html',
          precompress: true,
          strict: false,
        })
      : adapterNode(),
  },
};
```

- [ ] **Step 2: Add build:static script to package.json**

Add to the `scripts` section:

```json
"build:static": "DOCSMD_ADAPTER=static vite build"
```

- [ ] **Step 3: Add pre-rendering support to doc route**

Update `src/routes/doc/[...path]/+page.server.ts`:

```typescript
import type { PageServerLoad } from './$types';
import { readDocument } from '$lib/server/docs';
import { error } from '@sveltejs/kit';
import { building } from '$app/environment';

export const prerender = !!building;

export async function entries() {
  if (!building) return [];

  const { readFileSync, existsSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const { getManifest } = await import('$lib/server/manifest');

  const manifest = getManifest();
  return manifest.documents.map((doc) => ({
    path: doc.path.replace(/\.md$/, ''),
  }));
}

export const load: PageServerLoad = async ({ params }) => {
  const docPath = params.path;

  if (!docPath) {
    throw error(404, 'Document path required');
  }

  const fullPath = docPath.endsWith('.md') ? docPath : `${docPath}.md`;

  try {
    const document = await readDocument(fullPath);
    return { document };
  } catch (e) {
    throw error(404, `Document not found: ${fullPath}`);
  }
};
```

- [ ] **Step 4: Conditionally hide write UI in static builds**

The layout already uses `data.authEnabled` and `data.user` to gate write UI. For static builds, the layout server load won't run. Add a client-side check using the `building` flag:

In `src/routes/doc/[...path]/+page.svelte`, the `canEdit()` function already returns `false` when `authEnabled` is false and no user is set, which is the right behavior since in static mode there's no server to set locals.

For static mode, the `+layout.server.ts` will not exist at runtime — page data will be pre-rendered. The `authEnabled: false` and `user: null` defaults ensure write buttons are hidden.

- [ ] **Step 5: Verify static build works**

```bash
cd /Users/joachimhaagenskeie/Projects/claude/specMD/specmd
DOCSMD_ADAPTER=static DOCSMD_REPO_ROOT=$(pwd) npx vite build
ls build-static/
```

- [ ] **Step 6: Commit**

```bash
git add svelte.config.js package.json src/routes/doc/\[...path\]/+page.server.ts
git commit -m "feat(phase4): add static site export with adapter-static and pre-rendering"
```

---

## Task 13: CLI Build Command

**Files:**
- Create: `specmd/cli/commands/build.ts`
- Modify: `specmd/cli/index.ts`

- [ ] **Step 1: Create the build command**

Create `cli/commands/build.ts`:

```typescript
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function build(options: { static?: boolean; out?: string }) {
  const repoRoot = process.cwd();
  const pkgDir = resolve(__dirname, '..', '..');

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    DOCSMD_REPO_ROOT: repoRoot,
  };

  if (options.static) {
    env.DOCSMD_ADAPTER = 'static';
    console.log(chalk.blue('Building static site...'));
  } else {
    console.log(chalk.blue('Building Node server...'));
  }

  try {
    execSync('npx vite build', {
      cwd: pkgDir,
      env,
      stdio: 'inherit',
    });

    const outDir = options.static ? 'build-static' : 'build';
    console.log(chalk.green(`\nBuild complete: ${resolve(pkgDir, outDir)}`));

    if (options.static) {
      console.log(chalk.dim(`\nServe with: npx serve ${resolve(pkgDir, outDir)}`));
    }
  } catch (e) {
    console.error(chalk.red('Build failed'));
    process.exit(1);
  }
}
```

- [ ] **Step 2: Register the build command in cli/index.ts**

Add after the existing `search` command:

```typescript
program
  .command('build')
  .description('Build a deployable documentation site')
  .option('--static', 'Build as a static site (no server required)')
  .option('--out <dir>', 'Output directory', 'build')
  .action(async (opts) => {
    const { build } = await import('./commands/build.js');
    await build(opts);
  });
```

- [ ] **Step 3: Commit**

```bash
git add cli/commands/build.ts cli/index.ts
git commit -m "feat(phase4): add 'docsmd build' CLI command for static and node builds"
```

---

## Task 14: CLI User Management Command

**Files:**
- Create: `specmd/cli/commands/user.ts`
- Modify: `specmd/cli/index.ts`

- [ ] **Step 1: Create the user command**

Create `cli/commands/user.ts`:

```typescript
import { resolve } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import chalk from 'chalk';
import yaml from 'js-yaml';
import bcrypt from 'bcryptjs';

interface UsersFile {
  users: Array<{
    email: string;
    name: string;
    password_hash: string;
    role: string;
  }>;
}

async function promptPassword(): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Password: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function userAdd(
  email: string,
  options: { name?: string; role?: string; docs?: string }
) {
  const docsDir = resolve(process.cwd(), options.docs || 'docs');
  const usersPath = resolve(docsDir, '.docsmd-users.yml');

  // Load existing users
  let data: UsersFile = { users: [] };
  if (existsSync(usersPath)) {
    const raw = readFileSync(usersPath, 'utf8');
    data = (yaml.load(raw) as UsersFile) || { users: [] };
  }

  // Check for duplicates
  if (data.users.some(u => u.email === email)) {
    console.error(chalk.red(`User ${email} already exists`));
    process.exit(1);
  }

  // Prompt for password
  const password = await promptPassword();
  if (!password || password.length < 6) {
    console.error(chalk.red('Password must be at least 6 characters'));
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  data.users.push({
    email,
    name: options.name || email.split('@')[0],
    password_hash: passwordHash,
    role: options.role || 'editor',
  });

  writeFileSync(usersPath, yaml.dump(data, { lineWidth: -1 }), 'utf8');
  console.log(chalk.green(`Added user ${email} with role ${options.role || 'editor'}`));
}

export async function userList(options: { docs?: string }) {
  const docsDir = resolve(process.cwd(), options.docs || 'docs');
  const usersPath = resolve(docsDir, '.docsmd-users.yml');

  if (!existsSync(usersPath)) {
    console.log(chalk.dim('No users file found. Run: docsmd user add <email>'));
    return;
  }

  const raw = readFileSync(usersPath, 'utf8');
  const data = (yaml.load(raw) as UsersFile) || { users: [] };

  if (data.users.length === 0) {
    console.log(chalk.dim('No users configured'));
    return;
  }

  console.log(chalk.bold('Users:'));
  for (const user of data.users) {
    const roleColor = user.role === 'admin' ? chalk.yellow : user.role === 'editor' ? chalk.blue : chalk.gray;
    console.log(`  ${user.email} — ${user.name} [${roleColor(user.role)}]`);
  }
}
```

- [ ] **Step 2: Register user commands in cli/index.ts**

Add after the `build` command:

```typescript
const userCmd = program
  .command('user')
  .description('Manage docsmd users (simple auth mode)');

userCmd
  .command('add <email>')
  .description('Add a new user')
  .option('--name <name>', 'Display name')
  .option('--role <role>', 'Role: viewer, editor, admin', 'editor')
  .option('-d, --docs <path>', 'Path to docs directory', 'docs')
  .action(async (email, opts) => {
    const { userAdd } = await import('./commands/user.js');
    await userAdd(email, opts);
  });

userCmd
  .command('list')
  .description('List all users')
  .option('-d, --docs <path>', 'Path to docs directory', 'docs')
  .action(async (opts) => {
    const { userList } = await import('./commands/user.js');
    await userList(opts);
  });
```

- [ ] **Step 3: Commit**

```bash
git add cli/commands/user.ts cli/index.ts
git commit -m "feat(phase4): add 'docsmd user add/list' CLI commands for simple auth management"
```

---

## Task 15: Docker Packaging

**Files:**
- Create: `specmd/Dockerfile`
- Create: `specmd/docker-compose.yml`
- Create: `specmd/.dockerignore`

- [ ] **Step 1: Create Dockerfile**

Create `Dockerfile` in the specmd root:

```dockerfile
FROM node:20-alpine

# Install Git (required for Git operations)
RUN apk add --no-cache git

WORKDIR /app

# Copy the built application
COPY build/ ./build/
COPY dist/ ./dist/
COPY templates/ ./templates/
COPY package.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# The repository is mounted as a volume at /repo
VOLUME /repo

# Environment
ENV PORT=5173
ENV HOST=0.0.0.0
ENV DOCSMD_REPO_ROOT=/repo
ENV NODE_ENV=production

EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173/api/health || exit 1

# Start the server directly
CMD ["node", "build/index.js"]
```

- [ ] **Step 2: Create docker-compose.yml**

Create `docker-compose.yml`:

```yaml
version: "3.8"
services:
  docsmd:
    build: .
    ports:
      - "5173:5173"
    volumes:
      - /path/to/your/repo:/repo:rw
    environment:
      - ORIGIN=http://localhost:5173
      # OAuth config (if using)
      # - DOCSMD_OAUTH_CLIENT_ID=your_client_id
      # - DOCSMD_OAUTH_CLIENT_SECRET=your_client_secret
      # - DOCSMD_SESSION_SECRET=your_secret_here
    restart: unless-stopped
```

- [ ] **Step 3: Create .dockerignore**

Create `.dockerignore`:

```
node_modules/
.svelte-kit/
src/
cli/
tests/
test-docs/
docs/
.git/
*.md
tsconfig*.json
vite.config.ts
svelte.config.js
.env*
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "feat(phase4): add Docker packaging with health check and compose example"
```

---

## Task 16: Update Documentation

**Files:**
- Modify: `specmd/README.md`

- [ ] **Step 1: Update README with Phase 4 features**

Add sections to the existing README covering:

1. **Authentication** — How to enable simple auth and OAuth, configuration reference
2. **Static Export** — How to build and deploy a static site
3. **Docker Deployment** — How to use Docker and docker-compose
4. **User Management** — CLI commands for adding users
5. **Live Reload** — SSE endpoint for external tool integration
6. **Health Check** — API endpoint for monitoring
7. **Environment Variables** — Full reference table

The documentation should cover:

```markdown
## Authentication

docsmd supports two authentication modes: **simple** (password-based) and **OAuth** (GitHub, GitLab, Google).

### Enabling Simple Auth

1. Add users via the CLI:
   ```bash
   docsmd user add alice@example.com --name "Alice" --role admin
   docsmd user add bob@example.com --name "Bob" --role editor
   ```

2. Enable auth in `docs/.docsmd.yml`:
   ```yaml
   auth:
     enabled: true
     mode: simple
   ```

3. Restart the server. Users will see a login page.

### Enabling OAuth

1. Create an OAuth app with your provider (GitHub, GitLab, or Google)
2. Configure in `docs/.docsmd.yml`:
   ```yaml
   auth:
     enabled: true
     mode: oauth
     oauth:
       provider: github
     roles:
       admin: ["alice@example.com"]
       editor: ["bob@example.com"]
   ```
3. Set environment variables:
   ```bash
   export DOCSMD_OAUTH_CLIENT_ID=your_client_id
   export DOCSMD_OAUTH_CLIENT_SECRET=your_client_secret
   ```

### Roles

| Role | Read | Edit | Commit | Push | Admin |
|------|------|------|--------|------|-------|
| viewer | Yes | — | — | — | — |
| editor | Yes | Yes | Yes | — | — |
| admin | Yes | Yes | Yes | Yes | Yes |

## Static Site Export

Build a static version of your documentation (no server required):

```bash
docsmd build --static
```

Output is written to `build-static/`. Serve with any HTTP server:

```bash
npx serve build-static
```

The static build pre-renders all document pages. Search works client-side. Edit/commit/push features are hidden.

## Docker Deployment

```bash
# Build the Docker image
docker build -t docsmd .

# Run with a repo mounted
docker run -p 5173:5173 -v /path/to/repo:/repo docsmd
```

Or use docker-compose:

```bash
docker-compose up -d
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DOCSMD_REPO_ROOT` | Path to the documentation repository |
| `DOCSMD_ADAPTER` | `node` or `static` |
| `DOCSMD_OAUTH_CLIENT_ID` | OAuth client ID |
| `DOCSMD_OAUTH_CLIENT_SECRET` | OAuth client secret |
| `DOCSMD_SESSION_SECRET` | Session signing secret |
| `DOCSMD_BASE_PATH` | Base path for subdirectory deployments |
| `ORIGIN` | Full origin URL (required for OAuth) |

## Health Check

```bash
curl http://localhost:5173/api/health
```

Returns:
```json
{
  "status": "healthy",
  "docs_root": "/repo/docs",
  "docs_found": true,
  "timestamp": "2026-03-28T12:00:00.000Z"
}
```

## Live Reload (SSE)

External tools can subscribe to file change events:

```bash
curl -N http://localhost:5173/api/events
```

Events are sent when markdown files in `docs/` are modified, added, or deleted.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(phase4): add authentication, static export, Docker, and API reference"
```

---

## Task 17: Run Full Test Suite & Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all existing tests**

```bash
cd /Users/joachimhaagenskeie/Projects/claude/specMD/specmd
npx vitest run
```
Expected: All tests pass (existing + new)

- [ ] **Step 2: Run type checking**

```bash
npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json
```
Expected: No errors

- [ ] **Step 3: Build the web app (node mode)**

```bash
npm run build:web
```
Expected: Build succeeds

- [ ] **Step 4: Build the CLI**

```bash
npm run build:cli
```
Expected: Build succeeds

- [ ] **Step 5: Verify auth works when disabled (default)**

Start the dev server and confirm:
- No login page appears
- All features work as before
- No "Sign In" button in the header
- Edit, commit, push all work without restrictions

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(phase4): final adjustments from verification"
```
