import type { PageServerLoad } from './$types';
import { readDocument } from '$lib/server/docs';
import { loadConfig } from '$lib/server/config';
import { getDocsStatus } from '$lib/server/git';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const docPath = params.path;
  if (!docPath) throw error(400, 'Document path required');
  const fullPath = docPath.endsWith('.md') ? docPath : `${docPath}.md`;
  try {
    const document = await readDocument(fullPath);
    const config = loadConfig();
    const gitStatus = await getDocsStatus();
    return {
      frontmatter: document.frontmatter,
      body: document.body,
      path: fullPath,
      config,
      gitStatus,
    };
  } catch {
    throw error(404, `Document not found: ${fullPath}`);
  }
};
