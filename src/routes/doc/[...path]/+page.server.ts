import type { PageServerLoad } from './$types';
import { readDocument } from '$lib/server/docs';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const docPath = params.path;

  if (!docPath) {
    throw error(404, 'Document path required');
  }

  const fullPath = docPath.endsWith('.md') ? docPath : `${docPath}.md`;

  try {
    const document = await readDocument(fullPath);
    return { document };
  } catch (e) {
    throw error(404, `Document not found: ${fullPath}`);
  }
};
