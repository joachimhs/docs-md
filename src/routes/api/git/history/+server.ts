import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getFileHistory } from '$lib/server/git';

export const GET: RequestHandler = async ({ url }) => {
  const path = url.searchParams.get('path');
  if (!path) throw error(400, 'path parameter is required');

  const limit = parseInt(url.searchParams.get('limit') || '50');
  const history = await getFileHistory(path, limit);
  return json(history);
};
