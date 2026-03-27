import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('manifest', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should generate manifest with correct structure', async () => {
    const { generateManifest } = await import('$lib/server/manifest');
    const manifest = generateManifest();
    expect(manifest.generated).toBeDefined();
    expect(manifest.version).toBe('0.1.0');
    expect(manifest.document_count).toBeGreaterThanOrEqual(8);
    expect(manifest.documents).toBeInstanceOf(Array);
  });

  it('should return cached manifest on subsequent calls', async () => {
    const { generateManifest, getManifest } = await import('$lib/server/manifest');
    generateManifest();
    const m1 = getManifest();
    const m2 = getManifest();
    expect(m1.generated).toBe(m2.generated);
  });

  it('should invalidate cache and regenerate', async () => {
    const { generateManifest, getManifest, invalidateManifest } = await import('$lib/server/manifest');
    generateManifest();
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

  it('should not write any files to disk', async () => {
    const { generateManifest } = await import('$lib/server/manifest');
    const { DOCS_ROOT } = await import('$lib/server/config');
    const { existsSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    generateManifest();
    expect(existsSync(resolve(DOCS_ROOT, '_manifest.json'))).toBe(false);
  });
});
