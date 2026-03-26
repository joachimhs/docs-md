import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

describe('manifest', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(async () => {
    // Clean up generated manifest
    try {
      const { DOCS_ROOT } = await import('$lib/server/config');
      const manifestPath = resolve(DOCS_ROOT, '_manifest.json');
      if (existsSync(manifestPath)) unlinkSync(manifestPath);
    } catch {}
  });

  it('should generate manifest with correct structure', async () => {
    const { generateManifest } = await import('$lib/server/manifest');
    const manifest = generateManifest();
    expect(manifest.generated).toBeDefined();
    expect(manifest.version).toBe('0.1.0');
    expect(manifest.document_count).toBeGreaterThanOrEqual(8);
    expect(manifest.documents).toBeInstanceOf(Array);
  });

  it('should write _manifest.json to disk', async () => {
    const { generateManifest } = await import('$lib/server/manifest');
    const { DOCS_ROOT } = await import('$lib/server/config');
    generateManifest();
    const manifestPath = resolve(DOCS_ROOT, '_manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
  });

  it('should return cached manifest on subsequent calls', async () => {
    const { generateManifest, getManifest } = await import('$lib/server/manifest');
    generateManifest();
    const m1 = getManifest();
    const m2 = getManifest();
    expect(m1.generated).toBe(m2.generated);
  });

  it('should invalidate cache', async () => {
    const { generateManifest, getManifest, invalidateManifest } = await import('$lib/server/manifest');
    generateManifest();
    const m1 = getManifest();
    invalidateManifest();
    const m2 = getManifest();
    expect(m2).toBeDefined();
    expect(m2.documents.length).toBeGreaterThan(0);
  });

  it('should have document_count matching documents array length', async () => {
    const { generateManifest } = await import('$lib/server/manifest');
    const manifest = generateManifest();
    expect(manifest.document_count).toBe(manifest.documents.length);
  });
});
