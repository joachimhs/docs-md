import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import FlexSearch from 'flexsearch';
import { scanDocs, type DocEntry } from '../lib/scan.js';
import { log } from '../lib/logger.js';
import chalk from 'chalk';

interface SearchOptions {
  docs: string;
  type?: string;
  status?: string;
  plain?: boolean;
  limit: string;
}

interface IndexDoc {
  id: string;
  title: string;
  body: string;
  tags: string;
}

/**
 * Strip basic markdown formatting for plain-text snippet generation.
 */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/^>\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract a short snippet from a body string around a keyword.
 */
function getSnippet(body: string, query: string, length = 160): string {
  const lower = body.toLowerCase();
  const queryLower = query.toLowerCase();
  const idx = lower.indexOf(queryLower);

  if (idx === -1) {
    return body.slice(0, length).trim() + (body.length > length ? '…' : '');
  }

  const start = Math.max(0, idx - 60);
  const end = Math.min(body.length, idx + queryLower.length + 100);
  const snippet = body.slice(start, end).trim();

  return (start > 0 ? '…' : '') + snippet + (end < body.length ? '…' : '');
}

export async function search(query: string, opts: SearchOptions): Promise<void> {
  const cwd = process.cwd();
  const docsRoot = resolve(cwd, opts.docs);
  const limit = parseInt(opts.limit, 10) || 10;
  const plain = opts.plain ?? false;

  if (!existsSync(docsRoot)) {
    log.error(`Docs directory not found: ${docsRoot}`);
    log.dim('Hint: run docsmd init to scaffold the docs folder.');
    process.exit(1);
  }

  let entries = scanDocs(docsRoot);

  // Apply type filter before indexing
  if (opts.type) {
    entries = entries.filter((e) => e.type === opts.type);
  }
  if (opts.status) {
    entries = entries.filter((e) => e.status === opts.status);
  }

  if (entries.length === 0) {
    log.warn('No documents found matching filters.');
    return;
  }

  // Build FlexSearch index
  const index = new (FlexSearch as unknown as { Document: new (opts: unknown) => {
    add: (doc: IndexDoc) => void;
    search: (query: string, opts: unknown) => Array<{ field: string; result: string[] }>;
  } }).Document({
    document: {
      id: 'id',
      index: [
        { field: 'title', tokenize: 'forward', resolution: 9 },
        { field: 'body', tokenize: 'strict', resolution: 5 },
        { field: 'tags', tokenize: 'strict', resolution: 7 },
      ],
    },
  });

  const entryMap = new Map<string, DocEntry>();

  for (const entry of entries) {
    const plainBody = stripMarkdown(entry.body);
    index.add({
      id: entry.id,
      title: entry.title,
      body: plainBody,
      tags: entry.tags.join(' '),
    });
    entryMap.set(entry.id, { ...entry, body: plainBody });
  }

  // Query the index — collect unique IDs from all field results
  const rawResults = index.search(query, { limit, enrich: false }) as Array<{ field: string; result: string[] }>;
  const seen = new Set<string>();
  const resultIds: string[] = [];

  for (const fieldResult of rawResults) {
    for (const id of fieldResult.result) {
      if (!seen.has(id)) {
        seen.add(id);
        resultIds.push(id);
      }
    }
  }

  const results = resultIds
    .slice(0, limit)
    .map((id) => entryMap.get(id))
    .filter((e): e is DocEntry => e !== undefined);

  if (results.length === 0) {
    log.warn(`No results for "${query}".`);
    return;
  }

  if (!plain) {
    log.header(`Search: "${query}"`);
    log.dim(`${results.length} result${results.length !== 1 ? 's' : ''}\n`);
  }

  for (const result of results) {
    const snippet = getSnippet(result.body, query);

    if (plain) {
      console.log(`${result.title} [${result.type}] ${result.path}`);
      if (snippet) console.log(`  ${snippet}`);
    } else {
      const typeBadge = chalk.cyan(`[${result.type}]`);
      const statusBadge = result.status ? chalk.dim(` · ${result.status}`) : '';
      console.log(`  ${chalk.bold(result.title)} ${typeBadge}${statusBadge}`);
      console.log(`  ${chalk.dim(result.path)}`);
      if (snippet) {
        console.log(`  ${chalk.dim(snippet)}`);
      }
      console.log('');
    }
  }
}
