import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { readDocument, updateDocument, archiveDocument } from '$lib/server/docs';
import { getManifest } from '$lib/server/manifest';
import { getFileAtCommit } from '$lib/server/git';

function findDocById(id: string) {
  const manifest = getManifest();
  return manifest.documents.find(d => d.id === id);
}

export const GET: RequestHandler = async ({ params, url }) => {
  const doc = findDocById(params.id);
  if (!doc) throw error(404, 'Document not found');

  const atHash = url.searchParams.get('at');
  if (atHash) {
    try {
      const content = await getFileAtCommit(doc.path, atHash);
      return json({ content, path: doc.path, hash: atHash });
    } catch {
      throw error(404, `Document not found at commit ${atHash}`);
    }
  }

  const document = await readDocument(doc.path);
  return json({ frontmatter: document.frontmatter, body: document.body, path: doc.path });
};

export const PUT: RequestHandler = async ({ params, request }) => {
  const doc = findDocById(params.id);
  if (!doc) throw error(404, 'Document not found');

  const { frontmatter, body } = await request.json();
  const result = updateDocument(doc.path, { frontmatter, body });
  return json(result);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const doc = findDocById(params.id);
  if (!doc) throw error(404, 'Document not found');

  const result = archiveDocument(doc.path);
  return json(result);
};
