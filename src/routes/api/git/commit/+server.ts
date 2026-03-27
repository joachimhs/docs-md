import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { commitDocChange } from '$lib/server/git';

export const POST: RequestHandler = async ({ request }) => {
  const { message, files, author } = await request.json();
  if (!message) throw error(400, 'message is required');

  // For now, commit a specific file. files[0] or use a default
  const docPath = files?.[0] || '';
  try {
    const result = await commitDocChange(docPath, message, author);
    return json({ hash: result.commit, message });
  } catch (e: any) {
    throw error(500, e.message || 'Commit failed');
  }
};
