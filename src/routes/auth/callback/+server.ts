import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { loadConfig } from '$lib/server/config';
import { resolveRole, getSessionSecret } from '$lib/server/auth';
import { createSessionToken } from '$lib/server/session';
import { GitHub, GitLab, Google } from 'arctic';

function getOAuthClient(config: ReturnType<typeof loadConfig>, callbackUrl: string) {
  const oauth = config.auth?.oauth;
  if (!oauth) throw new Error('OAuth not configured');

  switch (oauth.provider) {
    case 'github':
      return new GitHub(oauth.client_id, oauth.client_secret, callbackUrl);
    case 'gitlab':
      // GitLab constructor: (baseURL, clientId, clientSecret, redirectURI)
      return new GitLab('https://gitlab.com', oauth.client_id, oauth.client_secret, callbackUrl);
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

  const origin = process.env.ORIGIN || 'http://localhost:5176';
  const callbackUrl = `${origin}/auth/callback`;

  const client = getOAuthClient(config, callbackUrl);

  // Step 1: If ?start=1, redirect to the provider's auth URL
  if (url.searchParams.get('start') === '1') {
    const state = crypto.randomUUID();
    cookies.set('docsmd-oauth-state', state, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 600,
    });

    let authUrl: URL;

    if (oauth.provider === 'google') {
      // Google requires a PKCE code verifier
      const codeVerifier = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      cookies.set('docsmd-oauth-verifier', codeVerifier, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 600,
      });
      authUrl = (client as Google).createAuthorizationURL(state, codeVerifier, ['openid', 'email', 'profile']);
    } else {
      const scopes = oauth.provider === 'github' ? ['user:email'] : ['read_user'];
      authUrl = (client as GitHub | GitLab).createAuthorizationURL(state, scopes);
    }

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
    let tokens;
    if (oauth.provider === 'google') {
      const codeVerifier = cookies.get('docsmd-oauth-verifier') || '';
      cookies.delete('docsmd-oauth-verifier', { path: '/' });
      tokens = await (client as Google).validateAuthorizationCode(code, codeVerifier);
    } else {
      tokens = await (client as GitHub | GitLab).validateAuthorizationCode(code);
    }

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

      if (!profile.email) {
        const emailRes = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const emails = await emailRes.json();
        const primary = emails.find((e: { primary: boolean; email: string }) => e.primary) || emails[0];
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
