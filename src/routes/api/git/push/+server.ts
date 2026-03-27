import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { pushChanges } from '$lib/server/git';
import { requirePermission } from '$lib/server/guards';

export const POST: RequestHandler = async (event) => {
  requirePermission(event, 'push');

  try {
    const result = await pushChanges();
    return json(result);
  } catch (e: any) {
    return json({ pushed: false, reason: e.message || 'Push failed' }, { status: 500 });
  }
};
