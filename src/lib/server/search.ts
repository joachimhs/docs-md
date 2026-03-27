import FlexSearch from 'flexsearch';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { getManifest } from './manifest';
import { DOCS_ROOT } from './config';
import type { SearchResult, SearchResponse, SearchFilters, ManifestEntry } from '$lib/types';

/** Internal document shape stored in the search index */
interface IndexDoc {
  id: string;
  title: string;
  body: string;
  tags: string;
  headings: string;
  owner: string;
}

/** The FlexSearch Document instance (module-level singleton) */
let index: FlexSearch.Document<IndexDoc, false> | null = null;

/** Map from document id to ManifestEntry for fast lookup */
let docMap: Map<string, ManifestEntry> = new Map();

/** Map from document id to plain-text body for snippet generation */
let bodyMap: Map<string, string> = new Map();

/**
 * Invalidate the search index so it rebuilds on the next query.
 */
export function invalidateSearchIndex(): void {
  index = null;
  docMap.clear();
  bodyMap.clear();
}

/**
 * Strip Markdown formatting to get plain text suitable for indexing and snippets.
 */
function stripMarkdown(md: string): string {
  return md
    // Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`[^`]*`/g, ' ')
    // Remove headings marker but keep text
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Remove links but keep link text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // Remove blockquote markers
    .replace(/^>\s*/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Read the raw markdown body for a document by its relative path.
 * Returns empty string if the file cannot be read.
 */
function readDocBody(relPath: string): string {
  const absolutePath = resolve(DOCS_ROOT, relPath);
  if (!existsSync(absolutePath)) return '';
  try {
    const raw = readFileSync(absolutePath, 'utf8');
    const { content } = matter(raw);
    return content;
  } catch {
    return '';
  }
}

/**
 * Extract heading text from markdown as a space-separated string.
 */
function extractHeadingText(md: string): string {
  const matches = md.match(/^#{1,6}\s+(.+)$/gm) || [];
  return matches
    .map(h => h.replace(/^#{1,6}\s+/, '').trim())
    .join(' ');
}

/**
 * Build (or rebuild) the FlexSearch index from the current manifest.
 * Should be called once at startup or after manifest changes.
 */
export function buildSearchIndex(): void {
  index = new FlexSearch.Document<IndexDoc, false>({
    document: {
      id: 'id',
      index: [
        { field: 'title', tokenize: 'forward', resolution: 9 },
        { field: 'body', tokenize: 'strict', resolution: 5 },
        { field: 'tags', tokenize: 'strict', resolution: 7 },
        { field: 'headings', tokenize: 'forward', resolution: 6 },
        { field: 'owner', tokenize: 'strict', resolution: 4 },
      ],
    },
  });

  docMap = new Map();
  bodyMap = new Map();

  const manifest = getManifest();

  for (const entry of manifest.documents) {
    const rawBody = readDocBody(entry.path);
    const plainBody = stripMarkdown(rawBody);
    const headingText = extractHeadingText(rawBody);

    const doc: IndexDoc = {
      id: entry.id,
      title: entry.title,
      body: plainBody,
      tags: entry.tags.join(' '),
      headings: headingText,
      owner: entry.owner,
    };

    index.add(doc);
    docMap.set(entry.id, entry);
    bodyMap.set(entry.id, plainBody);
  }
}

/**
 * Parse field prefixes (type:, tag:, status:, owner:) from a query string.
 * Returns the cleaned query (without prefixes) and extracted filters.
 *
 * Example: "type:adr PostgreSQL" → { cleanQuery: "PostgreSQL", filters: { type: "adr" } }
 */
export function parseFieldPrefixes(query: string): { cleanQuery: string; filters: Partial<SearchFilters> } {
  const filters: Partial<SearchFilters> = {};
  let cleanQuery = query;

  const prefixRegex = /\b(type|tag|status|owner):(\S+)/g;
  let match;

  while ((match = prefixRegex.exec(query)) !== null) {
    const [fullMatch, field, value] = match;
    switch (field) {
      case 'type':
        filters.type = value;
        break;
      case 'status':
        filters.status = value;
        break;
      case 'tag':
        filters.tags = [...(filters.tags || []), value];
        break;
      case 'owner':
        filters.owner = value;
        break;
    }
    cleanQuery = cleanQuery.replace(fullMatch, '');
  }

  return { cleanQuery: cleanQuery.trim(), filters };
}

/**
 * Generate a short snippet around the first occurrence of the query in text.
 * Wraps matching terms with <mark> tags.
 *
 * @param text   - plain text to search within
 * @param query  - the search query (used to locate and highlight)
 * @param maxLength - maximum total snippet length (default 200)
 */
export function generateSnippet(text: string, query: string, maxLength = 200): string {
  if (!text || !query) return text ? text.slice(0, maxLength) : '';

  const terms = query
    .split(/\s+/)
    .filter(t => t.length > 1)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (terms.length === 0) return text.slice(0, maxLength);

  // Find the first term occurrence (case-insensitive)
  const searchRegex = new RegExp(terms.join('|'), 'i');
  const match = searchRegex.exec(text);

  let start: number;
  let end: number;

  if (match) {
    const contextBefore = 60;
    const contextAfter = maxLength - contextBefore;
    start = Math.max(0, match.index - contextBefore);
    end = Math.min(text.length, match.index + contextAfter);
  } else {
    start = 0;
    end = Math.min(text.length, maxLength);
  }

  let snippet = text.slice(start, end);

  // Add ellipsis if truncated
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  // Wrap all matching terms in <mark> tags
  const highlightRegex = new RegExp(`(${terms.join('|')})`, 'gi');
  snippet = snippet.replace(highlightRegex, '<mark>$1</mark>');

  return snippet;
}

/**
 * Build facets (counts by type, status, and tag) from the full manifest.
 * These counts reflect the entire corpus, not just current search results.
 */
export function buildFacets(): { type: Record<string, number>; status: Record<string, number>; tags: Record<string, number> } {
  const type: Record<string, number> = {};
  const status: Record<string, number> = {};
  const tags: Record<string, number> = {};

  for (const entry of docMap.values()) {
    if (entry.type) {
      type[entry.type] = (type[entry.type] || 0) + 1;
    }
    if (entry.status) {
      status[entry.status] = (status[entry.status] || 0) + 1;
    }
    for (const tag of entry.tags) {
      tags[tag] = (tags[tag] || 0) + 1;
    }
  }

  return { type, status, tags };
}

/**
 * Apply filters to a ManifestEntry. Returns true if the entry matches all active filters.
 */
function matchesFilters(entry: ManifestEntry, filters: Partial<SearchFilters>): boolean {
  if (filters.type && entry.type !== filters.type) return false;
  if (filters.status && entry.status !== filters.status) return false;
  if (filters.owner && entry.owner !== filters.owner) return false;
  if (filters.tags && filters.tags.length > 0) {
    const hasAllTags = filters.tags.every(t => entry.tags.includes(t));
    if (!hasAllTags) return false;
  }
  return true;
}

/**
 * Main search function.
 *
 * @param query   - Raw query string (may include field prefixes like "type:adr")
 * @param filters - Explicit filter overrides (explicit wins over parsed prefixes)
 * @param limit   - Maximum number of results to return (default 50)
 */
export function searchDocs(
  query: string,
  filters?: Partial<SearchFilters>,
  limit = 50,
): SearchResponse {
  // Ensure index is built
  if (!index) {
    buildSearchIndex();
  }

  // Parse field prefixes from query
  const { cleanQuery, filters: parsedFilters } = parseFieldPrefixes(query);

  // Merge filters: explicit wins over parsed
  const mergedFilters: Partial<SearchFilters> = { ...parsedFilters, ...filters };

  // Normalise: remove null values from explicit filters so they don't override parsed ones
  if (filters) {
    for (const key of Object.keys(filters) as Array<keyof SearchFilters>) {
      const val = filters[key];
      if (val === null || (Array.isArray(val) && val.length === 0)) {
        // Explicit nulls should clear the parsed filter too
        if (key === 'tags') {
          mergedFilters.tags = [];
        } else {
          (mergedFilters as any)[key] = null;
        }
      }
    }
  }

  const hasFilters = !!(
    mergedFilters.type ||
    mergedFilters.status ||
    mergedFilters.owner ||
    (mergedFilters.tags && mergedFilters.tags.length > 0)
  );

  // Both empty: return nothing
  if (!cleanQuery && !hasFilters) {
    return {
      query,
      total: 0,
      results: [],
      facets: buildFacets(),
    };
  }

  let matchedIds: Set<string>;

  if (!cleanQuery && hasFilters) {
    // Filter-only: return all docs matching filters
    matchedIds = new Set(
      Array.from(docMap.values())
        .filter(entry => matchesFilters(entry, mergedFilters))
        .map(entry => entry.id),
    );
  } else {
    // Full-text search
    const fieldResults = index!.search(cleanQuery, limit * 2);

    // Collect and deduplicate IDs from all field results
    const rawIds = new Set<string>();
    for (const fieldResult of fieldResults) {
      for (const id of fieldResult.result) {
        rawIds.add(String(id));
      }
    }

    // Post-filter by merged filters if any
    if (hasFilters) {
      matchedIds = new Set<string>();
      for (const id of rawIds) {
        const entry = docMap.get(id);
        if (entry && matchesFilters(entry, mergedFilters)) {
          matchedIds.add(id);
        }
      }
    } else {
      matchedIds = rawIds;
    }
  }

  // Build results list
  const results: SearchResult[] = [];

  for (const id of matchedIds) {
    const entry = docMap.get(id);
    if (!entry) continue;

    const bodyText = bodyMap.get(id) || '';
    const snippet = generateSnippet(bodyText, cleanQuery || (mergedFilters.tags?.[0] ?? ''));

    results.push({
      id: entry.id,
      title: entry.title,
      type: entry.type,
      status: entry.status,
      path: entry.path,
      score: 1,
      snippet,
      tags: entry.tags,
      updated: entry.updated,
    });

    if (results.length >= limit) break;
  }

  // Sort by title relevance: exact title match first
  if (cleanQuery) {
    const lowerQuery = cleanQuery.toLowerCase();
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aExact = aTitle.includes(lowerQuery) ? 0 : 1;
      const bExact = bTitle.includes(lowerQuery) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.title.localeCompare(b.title);
    });
  }

  return {
    query,
    total: results.length,
    results,
    facets: buildFacets(),
  };
}
