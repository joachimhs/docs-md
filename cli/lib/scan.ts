import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import matter from 'gray-matter';

export interface DocEntry {
  id: string;
  title: string;
  type: string;
  status: string;
  owner: string;
  created: string;
  updated: string;
  tags: string[];
  path: string;
  summary: string;
  word_count: number;
  body: string;
}

/**
 * Infer document type from the first directory component of the relative path.
 * Root-level files are typed 'doc'.
 */
function inferType(relPath: string): string {
  const parts = relPath.split('/');
  return parts.length > 1 ? parts[0] : 'doc';
}

/**
 * Generate a stable ID from type and filename.
 */
function generateId(type: string, relPath: string): string {
  const filename = basename(relPath, '.md');
  return filename.startsWith(type) ? filename : `${type}-${filename}`;
}

/**
 * Extract the first non-heading paragraph from markdown body, up to 200 chars.
 */
function extractSummary(markdown: string): string {
  const lines = markdown.split('\n');
  const paragraphLines: string[] = [];
  let inParagraph = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('#')) {
      if (inParagraph) break;
      continue;
    }

    if (trimmed === '') {
      if (inParagraph) break;
      continue;
    }

    inParagraph = true;
    paragraphLines.push(trimmed);
  }

  const paragraph = paragraphLines.join(' ');
  return paragraph.length > 200 ? paragraph.slice(0, 200) : paragraph;
}

/**
 * Count words in a markdown body string.
 */
function countWords(text: string): number {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Recursively walk a directory and collect .md file paths.
 * Skips entries whose names start with '_' or '.'.
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
 * Scan all .md documents under docsRoot and return sorted DocEntry[].
 * Sorted by type then title.
 */
export function scanDocs(docsRoot: string): DocEntry[] {
  const files = walkMarkdownFiles(docsRoot);
  const entries: DocEntry[] = [];

  for (const filePath of files) {
    try {
      const raw = readFileSync(filePath, 'utf8');
      const { data, content } = matter(raw);

      if (!data.title || String(data.title).trim() === '') continue;

      const relPath = relative(docsRoot, filePath);
      const inferredType = inferType(relPath);
      const type = data.type ? String(data.type) : inferredType;
      const id = data.id ? String(data.id) : generateId(type, relPath);
      const tags = Array.isArray(data.tags)
        ? data.tags
        : data.tags
          ? [String(data.tags)]
          : [];
      const summary = data.summary ? String(data.summary) : extractSummary(content);

      entries.push({
        id,
        title: String(data.title).trim(),
        type,
        status: data.status ? String(data.status) : '',
        owner: data.owner ? String(data.owner) : '',
        created: data.created ? String(data.created) : '',
        updated: data.updated ? String(data.updated) : '',
        tags,
        path: relPath,
        summary,
        word_count: countWords(content),
        body: content,
      });
    } catch {
      // Skip files that can't be parsed
    }
  }

  entries.sort((a, b) => {
    const typeCmp = a.type.localeCompare(b.type);
    if (typeCmp !== 0) return typeCmp;
    return a.title.localeCompare(b.title);
  });

  return entries;
}
