import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getFileDiff } from '$lib/server/git';

export const GET: RequestHandler = async ({ url }) => {
  const path = url.searchParams.get('path');
  const from = url.searchParams.get('from');
  if (!path || !from) throw error(400, 'path and from parameters are required');

  const to = url.searchParams.get('to') || undefined;
  const diff = await getFileDiff(path, from, to);
  return json({ diff });
};
