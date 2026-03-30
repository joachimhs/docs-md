import type { Handle } from '@sveltejs/kit';
import { isAuthEnabled } from '$lib/server/auth';
import { validateSessionToken } from '$lib/server/session';
import { getSessionSecret } from '$lib/server/auth';
import { parse } from 'cookie';
import { error } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // CSRF protection for state-changing API requests
  const method = event.request.method;
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && event.url.pathname.startsWith('/api/')) {
    const origin = event.request.headers.get('origin');
    const host = event.request.headers.get('host');

    // If Origin header is present, it must match the host
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          throw error(403, 'CSRF check failed: origin mismatch');
        }
      } catch (e: any) {
        if (e?.status === 403) throw e;
        throw error(403, 'CSRF check failed: invalid origin');
      }
    }
    // If no Origin header, check for a Content-Type that browsers can't send cross-origin
    // (Browsers can send application/x-www-form-urlencoded cross-origin but not application/json without CORS)
  }

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
