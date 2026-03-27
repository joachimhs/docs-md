---
title: "Architecture Overview"
type: spec
status: approved
created: "2026-03-27"
updated: "2026-03-27"
tags: [architecture, sveltekit, svelte5]
owner: "@docsmd"
---

# Architecture Overview

docs.md is a SvelteKit application that reads Markdown files from a filesystem and serves them as a documentation site. Phase 1 implements a read-only browser.

## Tech Stack

- **SvelteKit 2** with adapter-node for server-side rendering
- **Svelte 5** with runes (`$state`, `$derived`, `$props`, `$effect`) — no legacy stores
- **TypeScript** in strict mode
- **unified/remark/rehype** pipeline for Markdown rendering
- **Shiki** for syntax highlighting (dual light/dark themes)
- **FlexSearch** for full-text search
- **gray-matter** for YAML frontmatter parsing
- **vitest** for testing

## Project Structure

```
docsmd/
├── src/
│   ├── app.css                    # Global CSS with light/dark themes
│   ├── app.html                   # HTML shell
│   ├── lib/
│   │   ├── types/index.ts         # All TypeScript interfaces
│   │   ├── server/                # Server-only modules
│   │   │   ├── config.ts          # REPO_ROOT, DOCS_ROOT, loadConfig()
│   │   │   ├── docs.ts            # scanDocs(), readDocument()
│   │   │   ├── markdown.ts        # renderMarkdown() pipeline
│   │   │   ├── manifest.ts        # generateManifest(), getManifest()
│   │   │   └── search.ts          # buildSearchIndex(), searchDocs()
│   │   ├── stores/                # Svelte 5 runes state
│   │   │   ├── docs.svelte.ts     # Document manifest state
│   │   │   ├── search.svelte.ts   # Search state with debounce
│   │   │   └── ui.svelte.ts       # Theme, sidebar state
│   │   └── components/            # 9 Svelte components
│   └── routes/
│       ├── +layout.server.ts      # Loads manifest + config
│       ├── +layout.svelte         # App shell
│       ├── +page.svelte           # Landing page
│       ├── doc/[...path]/         # Document viewer
│       ├── search/                # Search page
│       └── api/                   # REST endpoints
├── test-docs/                     # Sample docs for testing
├── tests/                         # vitest test suite
├── docs/                          # Project's own documentation
└── package.json
```

## Data Flow

### Document Loading

1. `+layout.server.ts` calls `getManifest()` on every page load
2. `getManifest()` returns cached manifest, reads from disk, or regenerates via `scanDocs()`
3. `scanDocs()` recursively walks `DOCS_ROOT`, parses each `.md` file with gray-matter
4. Manifest data flows to the layout, populating the sidebar and doc stores

### Document Rendering

1. `/doc/[...path]` route calls `readDocument(path)` on the server
2. `readDocument()` parses frontmatter with gray-matter
3. Body is rendered to HTML via the unified pipeline:
   `remarkParse → remarkGfm → remarkRehype → rehypeShiki → rehypeSlug → rehypeStringify`
4. Headings are extracted for the table of contents
5. The rendered HTML is passed to the page component and displayed in a `.prose` container

### Search

1. `buildSearchIndex()` creates a FlexSearch Document index from all manifest entries
2. Each document's body is stripped of Markdown formatting and indexed alongside title, tags, headings, and owner
3. `searchDocs(query)` parses field-specific prefixes (e.g., `type:adr`) then queries FlexSearch
4. Results are post-filtered, scored, deduplicated across fields, and enriched with snippets

## Server Modules

### config.ts

Reads `DOCSMD_REPO_ROOT` and `DOCSMD_DOCS_DIR` from environment variables. Loads `.docsmd.yml` from the docs root and merges with built-in defaults for 8 document types.

### docs.ts

Filesystem operations: scanning directories, parsing individual documents, extracting headings and summaries. Never imported from client code.

### markdown.ts

A cached unified processor pipeline. The processor is initialized once (Shiki theme loading is expensive) and reused for all subsequent renders.

### manifest.ts

Generates and caches `_manifest.json` — a JSON index of all documents with metadata. Supports cache invalidation for when documents change.

### search.ts

Full-text search powered by FlexSearch with support for field-specific query prefixes (`type:`, `tag:`, `status:`, `owner:`). Includes snippet generation with `<mark>` highlighting and faceted counts.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search?q=...` | GET | Full-text search with filters |
| `/api/docs?type=...` | GET | List documents with optional filters |
| `/api/manifest` | POST | Regenerate the document manifest |

## State Management

All client state uses Svelte 5 runes classes:

- **DocsState** — manifest, config, computed groupings (byType, recentDocs, allTags)
- **SearchState** — query, results, filters, facets, debounced search execution
- **UIState** — sidebar visibility, theme preference with localStorage persistence

## Testing

42 unit tests cover the 5 server modules:

- `config.test.ts` — config loading and merging
- `docs.test.ts` — document scanning and parsing
- `markdown.test.ts` — Markdown rendering pipeline
- `manifest.test.ts` — manifest generation and caching
- `search.test.ts` — full-text and field-specific search
