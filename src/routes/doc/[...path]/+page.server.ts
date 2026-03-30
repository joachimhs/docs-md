import type { PageServerLoad } from './$types';
import { readDocument, findBacklinks } from '$lib/server/docs';
import { error } from '@sveltejs/kit';

const isStatic = process.env.DOCSMD_ADAPTER === 'static';

export const prerender = isStatic;

export async function entries() {
  if (!isStatic) return [];

  const { getManifest } = await import('$lib/server/manifest');
  const manifest = getManifest();
  return manifest.documents.map((doc) => ({
    path: doc.path.replace(/\.md$/, ''),
  }));
}

export const load: PageServerLoad = async ({ params }) => {
  const docPath = params.path;

  if (!docPath) {
    throw error(404, 'Document path required');
  }

  const fullPath = docPath.endsWith('.md') ? docPath : `${docPath}.md`;

  try {
    const document = await readDocument(fullPath);
    const backlinks = findBacklinks(fullPath);
    return { document, backlinks };
  } catch (e) {
    throw error(404, `Document not found: ${fullPath}`);
  }
};
