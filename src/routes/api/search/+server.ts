import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { searchDocs } from '$lib/server/search';

export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get('q') || '';
  const type = url.searchParams.get('type') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const tag = url.searchParams.get('tag') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '50');

  if (!query.trim()) {
    return json({ query: '', total: 0, results: [], facets: { type: {}, status: {}, tags: {} } });
  }

  const filters = {
    type: type || null,
    status: status || null,
    tags: tag ? [tag] : [],
    owner: null,
  };

  const results = searchDocs(query, filters, limit);
  return json(results);
};
