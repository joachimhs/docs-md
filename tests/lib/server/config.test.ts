import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('config', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should have DOCS_ROOT pointing to test-docs', async () => {
    const { DOCS_ROOT } = await import('$lib/server/config');
    expect(DOCS_ROOT).toContain('test-docs');
  });

  it('should load config with default types when .docsmd.yml exists', async () => {
    const { loadConfig } = await import('$lib/server/config');
    const config = loadConfig();
    expect(config.types.adr).toBeDefined();
    expect(config.types.adr.label).toBe('ADR');
    expect(config.types.spec).toBeDefined();
    expect(config.project.name).toBe('Acme Platform'); // from test-docs/.docsmd.yml
  });

  it('should have all 8 default document types', async () => {
    const { loadConfig } = await import('$lib/server/config');
    const config = loadConfig();
    const types = Object.keys(config.types);
    expect(types).toContain('adr');
    expect(types).toContain('spec');
    expect(types).toContain('guide');
    expect(types).toContain('runbook');
    expect(types).toContain('api');
    expect(types).toContain('rfc');
    expect(types).toContain('meeting');
    expect(types).toContain('doc');
  });

  it('should merge user config with defaults', async () => {
    const { loadConfig } = await import('$lib/server/config');
    const config = loadConfig();
    // User config project name should override default
    expect(config.project.name).toBe('Acme Platform');
    // But default types should still be present
    expect(config.types.doc).toBeDefined();
  });

  it('should have correct default search config', async () => {
    const { loadConfig } = await import('$lib/server/config');
    const config = loadConfig();
    expect(config.search?.fuzzy_threshold).toBe(0.6);
    expect(config.search?.result_limit).toBe(50);
    expect(config.search?.snippet_length).toBe(200);
  });

  it('should have correct default UI config', async () => {
    const { loadConfig } = await import('$lib/server/config');
    const config = loadConfig();
    expect(config.ui?.theme).toBe('auto');
    expect(config.ui?.sidebar_default).toBe('expanded');
  });
});

describe('auth config defaults', () => {
  it('returns auth disabled by default', async () => {
    vi.resetModules();
    const { loadConfig } = await import('$lib/server/config');
    const config = loadConfig();
    expect(config.auth).toBeDefined();
    expect(config.auth!.enabled).toBe(false);
    expect(config.auth!.mode).toBe('simple');
    expect(config.auth!.public_read).toBe(true);
  });

  it('returns hosting defaults', async () => {
    vi.resetModules();
    const { loadConfig } = await import('$lib/server/config');
    const config = loadConfig();
    expect(config.hosting).toBeDefined();
    expect(config.hosting!.adapter).toBe('node');
    expect(config.hosting!.base_path).toBe('/');
  });
});
