import type { PageServerLoad, Actions } from './$types';
import { getAuthMode, validateSimpleAuth, getSessionSecret } from '$lib/server/auth';
import { createSessionToken } from '$lib/server/session';
import { redirect, fail } from '@sveltejs/kit';
import { loadConfig } from '$lib/server/config';

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
