import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, unlinkSync, rmdirSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

describe('docs CRUD', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // Track created paths for cleanup
  const createdPaths: string[] = [];

  afterEach(async () => {
    // Clean up any created test files
    try {
      const { DOCS_ROOT } = await import('$lib/server/config');
      const { invalidateManifest } = await import('$lib/server/manifest');

      for (const relPath of createdPaths) {
        const absPath = resolve(DOCS_ROOT, relPath);
        if (existsSync(absPath)) {
          unlinkSync(absPath);
        }
        // Also check archive location
        const archivePath = resolve(DOCS_ROOT, '_archive', relPath);
        if (existsSync(archivePath)) {
          unlinkSync(archivePath);
        }
      }
      createdPaths.length = 0;

      // Clean up _archive dir if empty
      const archiveDir = resolve(DOCS_ROOT, '_archive');
      if (existsSync(archiveDir)) {
        try {
          // Remove subdirectories created during tests
          const cleanDir = (dir: string) => {
            const entries = readdirSync(dir);
            for (const entry of entries) {
              const full = join(dir, entry);
              try {
                rmdirSync(full);
              } catch { /* not empty or not a dir */ }
            }
            try { rmdirSync(dir); } catch { /* not empty */ }
          };
          cleanDir(archiveDir);
        } catch { /* ignore */ }
      }

      // Clean up manifest
      const manifestPath = resolve(DOCS_ROOT, '_manifest.json');
      if (existsSync(manifestPath)) unlinkSync(manifestPath);

      invalidateManifest();
    } catch { /* ignore cleanup errors */ }
  });

  describe('slugify', () => {
    it('converts text to lowercase hyphenated slug', async () => {
      const { slugify } = await import('$lib/server/docs');
      expect(slugify('Use PostgreSQL as Primary DB')).toBe('use-postgresql-as-primary-db');
    });

    it('removes special characters', async () => {
      const { slugify } = await import('$lib/server/docs');
      expect(slugify('Hello, World!')).toBe('hello-world');
    });

    it('collapses multiple spaces/hyphens into single hyphen', async () => {
      const { slugify } = await import('$lib/server/docs');
      expect(slugify('foo  bar---baz')).toBe('foo-bar-baz');
    });

    it('strips leading and trailing hyphens', async () => {
      const { slugify } = await import('$lib/server/docs');
      expect(slugify('  hello  ')).toBe('hello');
    });

    it('truncates to 60 characters', async () => {
      const { slugify } = await import('$lib/server/docs');
      const longText = 'this is a very long title that should be truncated at sixty characters total';
      const result = slugify(longText);
      expect(result.length).toBeLessThanOrEqual(60);
    });

    it('handles special chars like apostrophes and slashes', async () => {
      const { slugify } = await import('$lib/server/docs');
      const result = slugify("It's a test / example");
      expect(result).not.toContain("'");
      expect(result).not.toContain('/');
    });
  });

  describe('getNextSequence', () => {
    it('returns next number after existing ADR docs (adr has 3, next is 4)', async () => {
      const { getNextSequence } = await import('$lib/server/docs');
      const next = getNextSequence('adr');
      expect(next).toBe(4);
    });

    it('returns 1 for a type with no existing docs', async () => {
      const { getNextSequence } = await import('$lib/server/docs');
      const next = getNextSequence('nonexistent-type');
      expect(next).toBe(1);
    });

    it('returns a number greater than 0', async () => {
      const { getNextSequence } = await import('$lib/server/docs');
      const next = getNextSequence('spec');
      expect(next).toBeGreaterThan(0);
    });
  });

  describe('createDocument', () => {
    it('creates a file at the correct path', async () => {
      const { createDocument, slugify } = await import('$lib/server/docs');
      const { DOCS_ROOT } = await import('$lib/server/config');

      const result = createDocument(
        { title: 'Test ADR Creation', type: 'adr', status: 'proposed' },
        'This is the body of the test ADR.'
      );

      createdPaths.push(result.path);

      const absPath = resolve(DOCS_ROOT, result.path);
      expect(existsSync(absPath)).toBe(true);
    });

    it('uses sequential numbering based on existing docs', async () => {
      const { createDocument } = await import('$lib/server/docs');

      const result = createDocument(
        { title: 'Sequence Test ADR', type: 'adr', status: 'proposed' },
        'Body content here.'
      );

      createdPaths.push(result.path);

      // adr has 3 docs, so next should be 004
      expect(result.filename).toMatch(/^adr-004-/);
    });

    it('sets created and updated dates', async () => {
      const { createDocument } = await import('$lib/server/docs');
      const { DOCS_ROOT } = await import('$lib/server/config');
      const { readFileSync } = await import('node:fs');
      const matter = (await import('gray-matter')).default;

      const result = createDocument(
        { title: 'Date Test ADR', type: 'adr' },
        'Body.'
      );

      createdPaths.push(result.path);

      const absPath = resolve(DOCS_ROOT, result.path);
      const raw = readFileSync(absPath, 'utf8');
      const { data } = matter(raw);

      const today = new Date().toISOString().split('T')[0];
      expect(data.created).toBe(today);
      expect(data.updated).toBe(today);
    });

    it('throws if title is missing', async () => {
      const { createDocument } = await import('$lib/server/docs');

      expect(() =>
        createDocument({ type: 'adr', status: 'proposed' }, 'Body.')
      ).toThrow('Title is required');
    });

    it('returns id, path, and filename', async () => {
      const { createDocument } = await import('$lib/server/docs');

      const result = createDocument(
        { title: 'Return Value Test', type: 'adr' },
        'Body content.'
      );

      createdPaths.push(result.path);

      expect(result.id).toBeDefined();
      expect(result.path).toBeDefined();
      expect(result.filename).toBeDefined();
      expect(result.filename.endsWith('.md')).toBe(true);
    });

    it('creates doc type at root level', async () => {
      const { createDocument } = await import('$lib/server/docs');
      const { DOCS_ROOT } = await import('$lib/server/config');

      const result = createDocument(
        { title: 'Root Level Doc Test', type: 'doc' },
        'Some body content.'
      );

      createdPaths.push(result.path);

      const absPath = resolve(DOCS_ROOT, result.path);
      expect(existsSync(absPath)).toBe(true);
      // doc type has empty folder, should be at root
      expect(result.path).not.toContain('/');
    });
  });

  describe('updateDocument', () => {
    it('merges frontmatter without replacing existing fields', async () => {
      const { createDocument, updateDocument } = await import('$lib/server/docs');
      const { DOCS_ROOT } = await import('$lib/server/config');
      const { readFileSync } = await import('node:fs');
      const matter = (await import('gray-matter')).default;

      // Create a doc first
      const created = createDocument(
        { title: 'Update Test ADR', type: 'adr', status: 'proposed', owner: '@alice' },
        'Original body.'
      );
      createdPaths.push(created.path);

      // Update only the status
      updateDocument(created.path, {
        frontmatter: { status: 'accepted' },
      });

      const absPath = resolve(DOCS_ROOT, created.path);
      const raw = readFileSync(absPath, 'utf8');
      const { data } = matter(raw);

      // Status updated
      expect(data.status).toBe('accepted');
      // Owner preserved
      expect(data.owner).toBe('@alice');
      // Title preserved
      expect(data.title).toBe('Update Test ADR');
    });

    it('replaces body when provided', async () => {
      const { createDocument, updateDocument } = await import('$lib/server/docs');
      const { DOCS_ROOT } = await import('$lib/server/config');
      const { readFileSync } = await import('node:fs');
      const matter = (await import('gray-matter')).default;

      const created = createDocument(
        { title: 'Body Replace Test', type: 'adr' },
        'Original body content.'
      );
      createdPaths.push(created.path);

      updateDocument(created.path, { body: 'Completely new body.' });

      const absPath = resolve(DOCS_ROOT, created.path);
      const raw = readFileSync(absPath, 'utf8');
      const { content } = matter(raw);

      expect(content.trim()).toBe('Completely new body.');
    });

    it('sets updated date on modification', async () => {
      const { createDocument, updateDocument } = await import('$lib/server/docs');
      const { DOCS_ROOT } = await import('$lib/server/config');
      const { readFileSync } = await import('node:fs');
      const matter = (await import('gray-matter')).default;

      const created = createDocument(
        { title: 'Updated Date Test', type: 'adr' },
        'Body.'
      );
      createdPaths.push(created.path);

      const result = updateDocument(created.path, { frontmatter: { status: 'accepted' } });

      const today = new Date().toISOString().split('T')[0];
      expect(result.updated).toBe(today);

      const absPath = resolve(DOCS_ROOT, created.path);
      const raw = readFileSync(absPath, 'utf8');
      const { data } = matter(raw);
      expect(data.updated).toBe(today);
    });

    it('throws if document does not exist', async () => {
      const { updateDocument } = await import('$lib/server/docs');

      expect(() =>
        updateDocument('adr/nonexistent-doc.md', { frontmatter: { status: 'accepted' } })
      ).toThrow('Document not found');
    });

    it('keeps existing body when no body update provided', async () => {
      const { createDocument, updateDocument } = await import('$lib/server/docs');
      const { DOCS_ROOT } = await import('$lib/server/config');
      const { readFileSync } = await import('node:fs');
      const matter = (await import('gray-matter')).default;

      const created = createDocument(
        { title: 'Body Preserve Test', type: 'adr' },
        'This body should not change.'
      );
      createdPaths.push(created.path);

      updateDocument(created.path, { frontmatter: { status: 'accepted' } });

      const absPath = resolve(DOCS_ROOT, created.path);
      const raw = readFileSync(absPath, 'utf8');
      const { content } = matter(raw);

      expect(content.trim()).toBe('This body should not change.');
    });
  });

  describe('archiveDocument', () => {
    it('moves document to _archive/ directory', async () => {
      const { createDocument, archiveDocument } = await import('$lib/server/docs');
      const { DOCS_ROOT } = await import('$lib/server/config');

      const created = createDocument(
        { title: 'Archive Test ADR', type: 'adr' },
        'This will be archived.'
      );
      createdPaths.push(created.path);

      const result = archiveDocument(created.path);

      // Original no longer exists
      const origPath = resolve(DOCS_ROOT, created.path);
      expect(existsSync(origPath)).toBe(false);

      // Archive exists
      const archivePath = resolve(DOCS_ROOT, result.archived_path);
      expect(existsSync(archivePath)).toBe(true);

      // Track archive path for cleanup
      createdPaths.push(result.archived_path);
    });

    it('returns archived_path starting with _archive/', async () => {
      const { createDocument, archiveDocument } = await import('$lib/server/docs');

      const created = createDocument(
        { title: 'Archive Path Test', type: 'adr' },
        'Body.'
      );
      createdPaths.push(created.path);

      const result = archiveDocument(created.path);
      createdPaths.push(result.archived_path);

      expect(result.archived_path.startsWith('_archive/')).toBe(true);
    });

    it('original no longer exists after archiving', async () => {
      const { createDocument, archiveDocument } = await import('$lib/server/docs');
      const { DOCS_ROOT } = await import('$lib/server/config');

      const created = createDocument(
        { title: 'Existence Test ADR', type: 'adr' },
        'Body.'
      );
      createdPaths.push(created.path);

      const result = archiveDocument(created.path);
      createdPaths.push(result.archived_path);

      const origPath = resolve(DOCS_ROOT, created.path);
      expect(existsSync(origPath)).toBe(false);
    });

    it('throws if document does not exist', async () => {
      const { archiveDocument } = await import('$lib/server/docs');

      expect(() =>
        archiveDocument('adr/nonexistent-doc.md')
      ).toThrow('Document not found');
    });

    it('returns an id in the result', async () => {
      const { createDocument, archiveDocument } = await import('$lib/server/docs');

      const created = createDocument(
        { title: 'ID Test ADR', type: 'adr' },
        'Body.'
      );
      createdPaths.push(created.path);

      const result = archiveDocument(created.path);
      createdPaths.push(result.archived_path);

      expect(result.id).toBeDefined();
      expect(result.id.length).toBeGreaterThan(0);
    });
  });
});
