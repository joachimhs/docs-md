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
