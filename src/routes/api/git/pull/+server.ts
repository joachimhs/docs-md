import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { triggerPull, getAutoPullStatus } from '$lib/server/autopull';
import { resetToRemote } from '$lib/server/git';
import { invalidateManifest } from '$lib/server/manifest';
import { invalidateSearchIndex } from '$lib/server/search';

/** GET: return current auto-pull status */
export const GET: RequestHandler = async () => {
  const status = getAutoPullStatus();
  return json(status);
};

/** POST: trigger manual pull or reset */
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => ({}));

  if (body.action === 'reset') {
    const result = await resetToRemote();
    if (result.reset) {
      invalidateManifest();
      invalidateSearchIndex();
    }
    return json(result);
  }

  // Default: pull
  const result = await triggerPull();
  return json(result);
};
