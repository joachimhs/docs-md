import { readdirSync, readFileSync, statSync, existsSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { resolve, relative, join, basename, dirname, normalize } from 'node:path';
import matter from 'gray-matter';
import { DOCS_ROOT, loadConfig } from './config';
import { renderMarkdown } from './markdown';
import { generateManifest, invalidateManifest, getManifest } from './manifest';
import type { DocFrontmatter, ManifestEntry, ParsedDocument, DocHeading } from '$lib/types';

/**
 * Resolve a user-supplied path within DOCS_ROOT safely.
 * Throws if the resolved path escapes the docs directory (path traversal).
 */
export function safePath(userPath: string, base: string = DOCS_ROOT): string {
  const resolved = resolve(base, normalize(userPath));
  if (!resolved.startsWith(base + '/') && resolved !== base) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

/**
 * Infer document type from relative path.
 * The first directory component becomes the type; root-level files are 'doc'.
 */
export function inferTypeFromPath(relPath: string): string {
  const parts = relPath.split('/');
  if (parts.length > 1) {
    return parts[0];
  }
  return 'doc';
}

/**
 * Generate a stable ID for a document.
 * If the filename (without extension) already starts with the type prefix, use the filename.
 * Otherwise prefix the filename with the type.
 */
export function generateId(type: string, relPath: string): string {
  const filename = basename(relPath, '.md');
  if (filename.startsWith(type)) {
    return filename;
  }
  return `${type}-${filename}`;
}

/**
 * Extract the first non-heading paragraph from markdown, up to 200 chars.
 */
export function extractFirstParagraph(markdown: string): string {
  const lines = markdown.split('\n');
  const paragraphLines: string[] = [];
  let inParagraph = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip headings
    if (trimmed.startsWith('#')) {
      if (inParagraph) break;
      continue;
    }

    // Blank line ends a paragraph
    if (trimmed === '') {
      if (inParagraph) break;
      continue;
    }

    // Non-empty, non-heading line: part of a paragraph
    inParagraph = true;
    paragraphLines.push(trimmed);
  }

  const paragraph = paragraphLines.join(' ');
  return paragraph.length > 200 ? paragraph.slice(0, 200) : paragraph;
}

/**
 * Extract headings from markdown source.
 * Generates a slug from heading text (lowercase, non-word chars removed/replaced).
 */
export function extractHeadings(markdown: string): DocHeading[] {
  const headings: DocHeading[] = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const slug = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    headings.push({ level, text, slug });
  }

  return headings;
}

/**
 * Count words in a markdown body string.
 */
function countWords(text: string): number {
  return text
    .replace(/```[\s\S]*?```/g, '') // strip code blocks
    .replace(/`[^`]*`/g, '')        // strip inline code
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0).length;
}

/**
 * Parse a single .md file into a ManifestEntry.
 * Returns null if the file is missing a title.
 */
export function parseManifestEntry(absolutePath: string): ManifestEntry | null {
  const raw = readFileSync(absolutePath, 'utf8');
  const { data, content } = matter(raw);
  const fm = data as DocFrontmatter;

  // Title is required
  if (!fm.title || String(fm.title).trim() === '') {
    return null;
  }

  const relPath = relative(DOCS_ROOT, absolutePath);
  const inferredType = inferTypeFromPath(relPath);
  const type = fm.type || inferredType;
  const id = fm.id || generateId(type, relPath);
  const summary = fm.summary || extractFirstParagraph(content);
  const tags = Array.isArray(fm.tags) ? fm.tags : fm.tags ? [String(fm.tags)] : [];

  return {
    id: String(id),
    title: String(fm.title).trim(),
    type: String(type),
    status: fm.status ? String(fm.status) : '',
    owner: fm.owner ? String(fm.owner) : '',
    created: fm.created ? String(fm.created) : '',
    updated: fm.updated ? String(fm.updated) : '',
    tags,
    path: relPath,
    summary: summary || '',
    word_count: countWords(content),
  };
}

/**
 * Recursively walk a directory and collect .md file paths.
 * Skips entries (files and directories) whose names start with '_' or '.'.
 */
function walkMarkdownFiles(dir: string): string[] {
  const results: string[] = [];

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    // Skip entries starting with _ or .
    if (entry.startsWith('_') || entry.startsWith('.')) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...walkMarkdownFiles(fullPath));
    } else if (stat.isFile() && entry.endsWith('.md')) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Scan all .md documents under DOCS_ROOT and return sorted ManifestEntry[].
 * Sorted by type then title (ascending).
 */
export function scanDocs(): ManifestEntry[] {
  const files = walkMarkdownFiles(DOCS_ROOT);
  const entries: ManifestEntry[] = [];

  for (const filePath of files) {
    const entry = parseManifestEntry(filePath);
    if (entry) {
      entries.push(entry);
    }
  }

  entries.sort((a, b) => {
    const typeCmp = a.type.localeCompare(b.type);
    if (typeCmp !== 0) return typeCmp;
    return a.title.localeCompare(b.title);
  });

  return entries;
}

/**
 * Read and fully parse a document by its path relative to DOCS_ROOT.
 * Throws if the file does not exist.
 */
export async function readDocument(docPath: string): Promise<ParsedDocument> {
  const absolutePath = safePath(docPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Document not found: ${docPath}`);
  }

  const raw = readFileSync(absolutePath, 'utf8');
  const { data, content } = matter(raw);
  const frontmatter = data as DocFrontmatter;

  const html = await renderMarkdown(content);
  const headings = extractHeadings(content);

  return {
    frontmatter,
    body: content,
    html,
    path: docPath,
    headings,
  };
}

/**
 * Convert a string to a URL-friendly slug.
 * Lowercases, removes special chars, collapses whitespace/hyphens, truncates to 60 chars.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * Return the next sequential number for a given document type.
 * Scans the type's folder for files matching `{type}-NNN-*.md`, returns max+1.
 * Returns 1 if no matching files exist.
 */
export function getNextSequence(type: string): number {
  const config = loadConfig();
  const typeConfig = config.types[type];
  const folder = typeConfig?.folder || type;
  const dir = folder ? resolve(DOCS_ROOT, folder) : DOCS_ROOT;

  if (!existsSync(dir)) return 1;

  const files = readdirSync(dir);
  let maxNum = 0;
  const pattern = new RegExp(`^${type}-(\\d+)-`);

  for (const file of files) {
    const match = file.match(pattern);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }

  return maxNum + 1;
}

/**
 * Create a new document file from frontmatter and body.
 * Assigns sequential filename, sets created/updated dates, writes to disk.
 * Throws if title is missing.
 */
export function createDocument(
  frontmatter: Partial<DocFrontmatter>,
  body: string
): { id: string; path: string; filename: string } {
  if (!frontmatter.title) throw new Error('Title is required');

  const type = frontmatter.type || 'doc';
  const config = loadConfig();
  const typeConfig = config.types[type];
  const folder = typeConfig?.folder !== undefined ? typeConfig.folder : type;
  const seq = getNextSequence(type);
  const slug = slugify(frontmatter.title);
  const filename = `${type}-${String(seq).padStart(3, '0')}-${slug}.md`;
  const today = new Date().toISOString().split('T')[0];

  const fullFrontmatter: Partial<DocFrontmatter> = {
    ...frontmatter,
    created: frontmatter.created || today,
    updated: today,
  };

  // Ensure directory exists
  const dir = folder ? resolve(DOCS_ROOT, folder) : DOCS_ROOT;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const filePath = folder ? join(folder, filename) : filename;
  const absolutePath = resolve(DOCS_ROOT, filePath);

  // Serialize with gray-matter
  const content = matter.stringify(body, fullFrontmatter);
  writeFileSync(absolutePath, content, 'utf8');

  // Regenerate manifest
  invalidateManifest();
  generateManifest();

  const id = `${type}-${String(seq).padStart(3, '0')}-${slug}`;
  return { id, path: filePath, filename };
}

/**
 * Update an existing document by merging frontmatter and/or replacing body.
 * Always updates the `updated` date. Throws if the document does not exist.
 */
export function updateDocument(
  docPath: string,
  updates: { frontmatter?: Partial<DocFrontmatter>; body?: string }
): { id: string; path: string; updated: string } {
  const absolutePath = safePath(docPath);
  if (!existsSync(absolutePath)) throw new Error(`Document not found: ${docPath}`);

  const raw = readFileSync(absolutePath, 'utf8');
  const { data, content } = matter(raw);

  // Merge frontmatter (shallow merge, don't replace)
  const mergedFrontmatter = { ...data, ...updates.frontmatter };
  const today = new Date().toISOString().split('T')[0];
  mergedFrontmatter.updated = today;

  // Replace body if provided, otherwise keep existing
  const newBody = updates.body !== undefined ? updates.body : content;

  const serialized = matter.stringify(newBody, mergedFrontmatter);
  writeFileSync(absolutePath, serialized, 'utf8');

  invalidateManifest();
  generateManifest();

  const id = generateId(mergedFrontmatter.type || 'doc', docPath);
  return { id, path: docPath, updated: today };
}

/**
 * Find all documents that reference the given document path.
 * Scans markdown bodies for links like [text](/doc/path) or [text](path.md) or (path).
 */
export function findBacklinks(docPath: string): Array<{ id: string; title: string; path: string; type: string }> {
  const manifest = getManifest();
  const backlinks: Array<{ id: string; title: string; path: string; type: string }> = [];

  // The target doc can be referenced in several ways:
  // - As a relative path: guide/guide-001-getting-started.md or guide/guide-001-getting-started
  // - As a URL path: /doc/guide/guide-001-getting-started
  // - Via frontmatter fields: related, supersedes, superseded_by
  const pathWithoutMd = docPath.replace(/\.md$/, '');
  const searchPatterns = [docPath, pathWithoutMd];

  for (const entry of manifest.documents) {
    if (entry.path === docPath) continue; // Skip self

    const absolutePath = resolve(DOCS_ROOT, entry.path);
    if (!existsSync(absolutePath)) continue;

    const raw = readFileSync(absolutePath, 'utf8');
    const { data, content } = matter(raw);

    // Check frontmatter references
    const fmRefs = [
      ...(Array.isArray(data.related) ? data.related : []),
      data.supersedes,
      data.superseded_by,
    ].filter(Boolean);

    const hasFmRef = fmRefs.some(ref =>
      searchPatterns.some(p => String(ref).includes(p))
    );

    // Check markdown body for links containing the path
    const hasBodyRef = searchPatterns.some(p => content.includes(p));

    if (hasFmRef || hasBodyRef) {
      backlinks.push({
        id: entry.id,
        title: entry.title,
        path: entry.path,
        type: entry.type,
      });
    }
  }

  return backlinks;
}

/**
 * Archive a document by moving it to `_archive/{original-path}`.
 * Throws if the document does not exist.
 */
export function archiveDocument(docPath: string): { id: string; archived_path: string } {
  const absolutePath = safePath(docPath);
  if (!existsSync(absolutePath)) throw new Error(`Document not found: ${docPath}`);

  const raw = readFileSync(absolutePath, 'utf8');
  const { data } = matter(raw);

  const archiveDir = resolve(DOCS_ROOT, '_archive');
  if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });

  // Preserve directory structure in archive
  const archivePath = join('_archive', docPath);
  const archiveAbsolute = resolve(DOCS_ROOT, archivePath);
  const archiveParent = resolve(archiveAbsolute, '..');
  if (!existsSync(archiveParent)) mkdirSync(archiveParent, { recursive: true });

  renameSync(absolutePath, archiveAbsolute);

  invalidateManifest();
  generateManifest();

  const id = generateId(data.type || 'doc', docPath);
  return { id, archived_path: archivePath };
}
