import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('docs', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('scanDocs', () => {
    it('should find all .md files in docs/', async () => {
      const { scanDocs } = await import('$lib/server/docs');
      const entries = scanDocs();
      expect(entries.length).toBeGreaterThanOrEqual(8);
    });

    it('should skip files starting with _', async () => {
      const { scanDocs } = await import('$lib/server/docs');
      const entries = scanDocs();
      const paths = entries.map(e => e.path);
      expect(paths.every(p => !p.includes('_templates'))).toBe(true);
      expect(paths.every(p => !p.includes('_assets'))).toBe(true);
    });

    it('should extract title from frontmatter', async () => {
      const { scanDocs } = await import('$lib/server/docs');
      const entries = scanDocs();
      expect(entries.every(e => e.title.length > 0)).toBe(true);
    });

    it('should assign correct type from frontmatter', async () => {
      const { scanDocs } = await import('$lib/server/docs');
      const entries = scanDocs();
      const adrs = entries.filter(e => e.type === 'adr');
      expect(adrs.length).toBe(3);
    });

    it('should count words in body', async () => {
      const { scanDocs } = await import('$lib/server/docs');
      const entries = scanDocs();
      expect(entries.every(e => e.word_count > 0)).toBe(true);
    });

    it('should extract tags as arrays', async () => {
      const { scanDocs } = await import('$lib/server/docs');
      const entries = scanDocs();
      const withTags = entries.filter(e => e.tags.length > 0);
      expect(withTags.length).toBeGreaterThan(0);
      expect(Array.isArray(withTags[0].tags)).toBe(true);
    });

    it('should generate IDs for documents', async () => {
      const { scanDocs } = await import('$lib/server/docs');
      const entries = scanDocs();
      expect(entries.every(e => e.id.length > 0)).toBe(true);
    });

    it('should sort entries by type then title', async () => {
      const { scanDocs } = await import('$lib/server/docs');
      const entries = scanDocs();
      for (let i = 1; i < entries.length; i++) {
        const cmp = entries[i-1].type.localeCompare(entries[i].type);
        if (cmp === 0) {
          expect(entries[i-1].title.localeCompare(entries[i].title)).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe('readDocument', () => {
    it('should parse frontmatter and render HTML', async () => {
      const { readDocument } = await import('$lib/server/docs');
      const doc = await readDocument('overview.md');
      expect(doc.frontmatter.title).toBeDefined();
      expect(doc.html).toContain('<h1');
      expect(doc.body.length).toBeGreaterThan(0);
    });

    it('should extract headings', async () => {
      const { readDocument } = await import('$lib/server/docs');
      const doc = await readDocument('overview.md');
      expect(doc.headings.length).toBeGreaterThan(0);
      expect(doc.headings[0]).toHaveProperty('level');
      expect(doc.headings[0]).toHaveProperty('text');
      expect(doc.headings[0]).toHaveProperty('slug');
    });

    it('should throw for non-existent document', async () => {
      const { readDocument } = await import('$lib/server/docs');
      await expect(readDocument('nonexistent.md')).rejects.toThrow();
    });

    it('should set path correctly', async () => {
      const { readDocument } = await import('$lib/server/docs');
      const doc = await readDocument('adr/adr-001-use-postgresql.md');
      expect(doc.path).toBe('adr/adr-001-use-postgresql.md');
    });
  });
});
