import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ cookies }) => {
  cookies.delete('docsmd-session', { path: '/' });
  throw redirect(302, '/');
};
