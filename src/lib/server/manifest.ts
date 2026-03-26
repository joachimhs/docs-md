import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Manifest } from '$lib/types';
import { scanDocs } from './docs';
import { DOCS_ROOT } from './config';

const MANIFEST_PATH = resolve(DOCS_ROOT, '_manifest.json');

let cachedManifest: Manifest | null = null;

export function generateManifest(): Manifest {
  const documents = scanDocs();

  const manifest: Manifest = {
    generated: new Date().toISOString(),
    version: '0.1.0',
    document_count: documents.length,
    documents,
  };

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  cachedManifest = manifest;
  return manifest;
}

export function getManifest(): Manifest {
  if (cachedManifest) return cachedManifest;

  if (existsSync(MANIFEST_PATH)) {
    try {
      const raw = readFileSync(MANIFEST_PATH, 'utf8');
      cachedManifest = JSON.parse(raw);
      return cachedManifest!;
    } catch {
      // Fall through to regenerate
    }
  }

  return generateManifest();
}

export function invalidateManifest(): void {
  cachedManifest = null;
}
