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
