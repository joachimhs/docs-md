import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getManifest } from '$lib/server/manifest';
import { createDocument } from '$lib/server/docs';
import { requirePermission } from '$lib/server/guards';

export const GET: RequestHandler = async ({ url }) => {
  const manifest = getManifest();
  let docs = [...manifest.documents];

  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const tag = url.searchParams.get('tag');
  const owner = url.searchParams.get('owner');

  if (type) docs = docs.filter(d => d.type === type);
  if (status) docs = docs.filter(d => d.status === status);
  if (tag) docs = docs.filter(d => d.tags.includes(tag));
  if (owner) docs = docs.filter(d => d.owner === owner);

  const sort = url.searchParams.get('sort') || 'title';
  const order = url.searchParams.get('order') || 'asc';
  docs.sort((a, b) => {
    const av = (a as any)[sort] || '';
    const bv = (b as any)[sort] || '';
    return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  return json(docs);
};

export const POST: RequestHandler = async (event) => {
  requirePermission(event, 'edit');

  const { frontmatter, body } = await event.request.json();
  if (!frontmatter?.title) {
    return json({ error: 'Title is required' }, { status: 400 });
  }
  const result = createDocument(frontmatter, body || '');
  return json(result, { status: 201 });
};
