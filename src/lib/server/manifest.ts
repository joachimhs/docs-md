import type { Manifest } from '$lib/types';
import { scanDocs } from './docs';

let cachedManifest: Manifest | null = null;

export function generateManifest(): Manifest {
  const documents = scanDocs();

  const manifest: Manifest = {
    generated: new Date().toISOString(),
    version: '0.1.0',
    document_count: documents.length,
    documents,
  };

  cachedManifest = manifest;
  return manifest;
}

export function getManifest(): Manifest {
  if (cachedManifest) return cachedManifest;
  return generateManifest();
}

export function invalidateManifest(): void {
  cachedManifest = null;
}
