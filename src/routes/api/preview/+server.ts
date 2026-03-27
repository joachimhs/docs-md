import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { renderMarkdown } from '$lib/server/markdown';

export const POST: RequestHandler = async ({ request }) => {
  const { markdown } = await request.json();
  if (!markdown) return json({ html: '' });
  const html = await renderMarkdown(markdown);
  return json({ html });
};
