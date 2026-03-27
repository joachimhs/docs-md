import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { commitDocChange } from '$lib/server/git';
import { requirePermission } from '$lib/server/guards';

export const POST: RequestHandler = async (event) => {
  requirePermission(event, 'commit');

  const { message, files, author } = await event.request.json();
  if (!message) throw error(400, 'message is required');

  const docPath = files?.[0] || '';

  // Append logged-in user to commit message
  const user = event.locals.user;
  const fullMessage = user
    ? `${message}\n\nCommitted via docsmd by ${user.name} <${user.email}>`
    : message;

  try {
    const result = await commitDocChange(docPath, fullMessage, author);
    return json({ hash: result.commit, message: fullMessage });
  } catch (e: any) {
    throw error(500, e.message || 'Commit failed');
  }
};
