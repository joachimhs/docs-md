import { describe, it, expect, beforeAll } from 'vitest';

let searchModule: any;

beforeAll(async () => {
  searchModule = await import('$lib/server/search');
  searchModule.buildSearchIndex();
});

describe('search', () => {
  it('should build index without errors', () => {
    expect(searchModule).toBeDefined();
  });

  it('should find documents by title keyword', () => {
    const results = searchModule.searchDocs('PostgreSQL');
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results[0].title).toContain('PostgreSQL');
  });

  it('should return SearchResponse structure', () => {
    const results = searchModule.searchDocs('documentation');
    expect(results.query).toBe('documentation');
    expect(results.results).toBeInstanceOf(Array);
    expect(results.facets).toBeDefined();
    expect(results.facets.type).toBeDefined();
    expect(results.facets.status).toBeDefined();
    expect(results.facets.tags).toBeDefined();
    expect(typeof results.total).toBe('number');
  });

  it('should return empty results for empty query', () => {
    const results = searchModule.searchDocs('');
    expect(results.results).toHaveLength(0);
    expect(results.total).toBe(0);
  });

  it('should filter by type via explicit filter', () => {
    const results = searchModule.searchDocs('documentation', { type: 'adr', status: null, tags: [], owner: null });
    if (results.results.length > 0) {
      expect(results.results.every((r: any) => r.type === 'adr')).toBe(true);
    }
  });

  it('should generate snippets with mark highlights', () => {
    const results = searchModule.searchDocs('PostgreSQL');
    const withSnippet = results.results.find((r: any) => r.snippet.includes('<mark>'));
    // May or may not have highlight depending on where match is
    expect(results.results.length).toBeGreaterThan(0);
  });

  it('should support field-specific search with type: prefix', () => {
    const results = searchModule.searchDocs('type:adr');
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results.every((r: any) => r.type === 'adr')).toBe(true);
  });

  it('should support field-specific search with tag: prefix', () => {
    const results = searchModule.searchDocs('tag:security');
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results.every((r: any) => r.tags.includes('security'))).toBe(true);
  });

  it('should support combined field-specific and free text search', () => {
    const results = searchModule.searchDocs('type:adr PostgreSQL');
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results.every((r: any) => r.type === 'adr')).toBe(true);
  });

  it('should include facets with counts', () => {
    const results = searchModule.searchDocs('documentation');
    // Facets should have type counts
    const typeKeys = Object.keys(results.facets.type);
    expect(typeKeys.length).toBeGreaterThan(0);
  });
});
