import type { PageServerLoad } from './$types';
import { loadConfig } from '$lib/server/config';
import { DOCS_ROOT } from '$lib/server/config';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';

export const load: PageServerLoad = async () => {
  const config = loadConfig();

  // Load templates if they exist
  const templatesDir = resolve(DOCS_ROOT, '_templates');
  const templates: Array<{ type: string; frontmatter: Record<string, unknown>; body: string }> = [];

  if (existsSync(templatesDir)) {
    for (const file of readdirSync(templatesDir)) {
      if (!file.endsWith('.md')) continue;
      const raw = readFileSync(resolve(templatesDir, file), 'utf8');
      const { data, content } = matter(raw);
      templates.push({
        type: data.type || file.replace('.md', ''),
        frontmatter: data,
        body: content,
      });
    }
  }

  return { templates, config };
};
