import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { scanDocs } from '../lib/scan.js';
import { log } from '../lib/logger.js';

interface ManifestOptions {
  docs: string;
}

export async function manifest(opts: ManifestOptions): Promise<void> {
  const cwd = process.cwd();
  const docsRoot = resolve(cwd, opts.docs);

  if (!existsSync(docsRoot)) {
    log.error(`Docs directory not found: ${docsRoot}`);
    log.dim('Hint: run docsmd init to scaffold the docs folder.');
    process.exit(1);
  }

  const entries = scanDocs(docsRoot);

  if (entries.length === 0) {
    log.warn('No documents found.');
    log.dim(`Searched: ${docsRoot}`);
    return;
  }

  // Per-type breakdown
  const byType: Record<string, number> = {};
  for (const entry of entries) {
    byType[entry.type] = (byType[entry.type] ?? 0) + 1;
  }

  log.header('docs.md manifest');
  log.info(`  Total: ${entries.length} document${entries.length !== 1 ? 's' : ''}`);
  console.log('');

  const sortedTypes = Object.keys(byType).sort();
  for (const type of sortedTypes) {
    const count = byType[type];
    log.dim(`${type.padEnd(12)} ${count} doc${count !== 1 ? 's' : ''}`);
  }

  console.log('');
  log.dim(`Docs root: ${docsRoot}`);
}
