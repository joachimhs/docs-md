import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getDocsStatus, isGitRepo } from '$lib/server/git';

export const GET: RequestHandler = async () => {
  if (!(await isGitRepo())) {
    return json({ error: 'Not a git repository' }, { status: 500 });
  }
  const status = await getDocsStatus();
  return json(status);
};
