import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, relative, join, basename, dirname } from 'node:path';
import matter from 'gray-matter';
import { DOCS_ROOT } from './config';
import { renderMarkdown } from './markdown';
import type { DocFrontmatter, ManifestEntry, ParsedDocument, DocHeading } from '$lib/types';

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
  const absolutePath = resolve(DOCS_ROOT, docPath);

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
