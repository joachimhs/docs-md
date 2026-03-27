---
title: "Architecture"
type: spec
status: approved
created: "2026-03-27"
updated: "2026-03-27"
tags: [architecture, internals]
owner: "@docsmd"
---

# Architecture

## Tech Stack

- **SvelteKit 2** with `@sveltejs/adapter-node` for server-side rendering
- **Svelte 5** — exclusively runes API (`$state`, `$derived`, `$props`, `$effect`). No legacy stores, no `export let`, no `$:`.
- **TypeScript** in strict mode with `bundler` module resolution
- **unified** ecosystem for Markdown: remark-parse, remark-gfm, remark-rehype, rehype-shiki, rehype-slug, rehype-stringify
- **Shiki** for syntax highlighting with dual themes (github-light + github-dark)
- **FlexSearch** 0.7 in Document mode for full-text search
- **gray-matter** for YAML frontmatter parsing
- **js-yaml** for `.docsmd.yml` configuration parsing
- **vitest** for unit testing with SvelteKit module aliases

## Server Modules

All in `src/lib/server/`. These are never imported by client code — SvelteKit enforces this via the `server/` directory convention.

### config.ts (93 lines)

Exports `REPO_ROOT`, `DOCS_ROOT`, and `loadConfig()`.

`REPO_ROOT` is resolved from `DOCSMD_REPO_ROOT` env var (falling back to `process.cwd()`). `DOCS_ROOT` is `resolve(REPO_ROOT, DOCSMD_DOCS_DIR || 'docs')`. The `DOCSMD_DOCS_DIR` override exists primarily for testing — vitest sets it to `test-docs`.

`loadConfig()` reads `.docsmd.yml` with js-yaml and merges with `DEFAULT_TYPES`, a hardcoded record of 8 document type definitions. The merge is shallow: `{ ...DEFAULT_TYPES, ...userConfig.types }`. User types extend but don't remove built-in types.

### docs.ts (218 lines)

The largest server module. Two main exports:

**`scanDocs(): ManifestEntry[]`** — Recursively walks `DOCS_ROOT` via `walkMarkdownFiles()`, which skips any entry starting with `_` or `.`. Each `.md` file is parsed by `parseManifestEntry()` using gray-matter. Documents without a `title` field return `null` and are silently dropped. Results are sorted by type (alphabetically) then title.

**`readDocument(docPath): Promise<ParsedDocument>`** — Reads a single file, parses frontmatter, renders body to HTML via `renderMarkdown()`, and extracts headings with `extractHeadings()` (regex-based, matching `^#{1,6}\s+(.+)$`). Returns a `ParsedDocument` with `frontmatter`, `body` (raw Markdown), `html`, `path`, and `headings`.

Helper functions: `inferTypeFromPath()` (first directory segment = type, root = `doc`), `generateId()` (uses filename if it starts with type prefix, otherwise prepends type), `extractFirstParagraph()` (first non-heading paragraph, max 200 chars), `countWords()` (strips code blocks, splits on whitespace).

### markdown.ts (36 lines)

A cached unified processor pipeline:

```
remarkParse → remarkGfm → remarkRehype → rehypeShiki → rehypeSlug → rehypeStringify
```

The processor is created once and stored in a module-level variable. First invocation takes ~2.4 seconds (Shiki theme loading); subsequent calls are fast. `rehypeShiki` generates inline styles for both `github-light` and `github-dark` themes — CSS selectors control which is visible. `rehypeSlug` adds `id` attributes to headings for the table of contents anchor links.

### manifest.ts (45 lines)

Manages `_manifest.json` in `DOCS_ROOT`. Three exports:

- `generateManifest()` — Calls `scanDocs()`, writes JSON to disk, caches in memory
- `getManifest()` — Returns memory cache → reads disk → regenerates (in that priority)
- `invalidateManifest()` — Clears the memory cache; next `getManifest()` call reads from disk or regenerates

The manifest is the source of truth for the sidebar, landing page, and search index. It includes `generated` (ISO timestamp), `version` (`0.1.0`), `document_count`, and `documents` (array of `ManifestEntry`).

### search.ts (383 lines)

The most complex module. Builds a FlexSearch Document index with 5 fields:

| Field | Tokenizer | Source |
|-------|-----------|--------|
| `title` | forward | Frontmatter title |
| `body` | strict | Markdown body stripped of formatting |
| `tags` | strict | Space-joined tags |
| `headings` | forward | Heading text extracted from body |
| `owner` | strict | Frontmatter owner |

**`buildSearchIndex()`** — Reads every document from the manifest, strips Markdown with `stripMarkdown()` (removes code blocks, inline code, links, markdown chars, collapses newlines), and adds to the FlexSearch index. Called lazily on first search.

**`parseFieldPrefixes(query)`** — Extracts `type:X`, `tag:X`, `status:X`, `owner:X` from the query string using regex `/\b(type|tag|status|owner):(\S+)/g`. Returns `{ cleanQuery, filters }`. Supports multiple prefixes in one query.

**`searchDocs(query, filters?, limit?)`** — Main entry point. Parses field prefixes, merges with explicit filters (explicit wins), then either:
- If `cleanQuery` is empty but filters exist: scans the full manifest with `matchesFilters()`
- If `cleanQuery` is non-empty: queries FlexSearch, deduplicates across fields (higher score = matched in more fields), post-filters by merged filters

Results are sorted by score descending (title matches boosted to top). Each result gets a snippet from `generateSnippet()` which finds the first occurrence of the query term and extracts ~60 chars before + ~140 chars after, wrapping matches in `<mark>` tags.

**`buildFacets()`** — Aggregates type/status/tag counts from the full manifest (not just search results). Always returns the complete facet picture.

## Stores

Three Svelte 5 runes-based singletons in `src/lib/stores/`:

**`docs.svelte.ts`** — `DocsState` class. State: `manifest` (ManifestEntry[]), `config` (DocsMDConfig), `activeDocPath`. Derived: `byType` (Record grouped by type), `types` (sorted unique type names), `allTags`, `recentDocs` (top 10 by `updated` date). Initialized in `+layout.svelte` from server-loaded data.

**`search.svelte.ts`** — `SearchState` class. State: `query`, `results`, `total`, `filters`, `facets`, `loading`. Has a 150ms debounce timer on `setQuery()`. `executeSearch()` fetches `GET /api/search` with query params and updates state. Toggle methods for each filter dimension.

**`ui.svelte.ts`** — `UIState` class. State: `sidebarOpen` (boolean), `theme` (`'light' | 'dark' | 'auto'`). Derived: `resolvedTheme` (resolves `auto` via `window.matchMedia('(prefers-color-scheme: dark)')`). Persists theme to `localStorage` under key `docsmd-theme`.

## Components

Nine components in `src/lib/components/`, all using Svelte 5 `$props()`:

| Component | Lines | Props | Purpose |
|-----------|-------|-------|---------|
| `Sidebar` | 197 | manifest, config, activePath, onLinkClick | Type-grouped navigation tree with collapsible sections |
| `SearchBar` | 177 | (none) | Header search with 200ms-debounced live preview dropdown (5 results) |
| `SearchResults` | 177 | results, loading, query | Result list with snippet highlighting, badges, tags |
| `SearchFacets` | 193 | facets, activeFilters, callbacks | Checkbox filter panel for type/status/tags |
| `DocHeader` | 130 | frontmatter, path | Title, badges, metadata, tag pills |
| `TableOfContents` | 116 | headings | Sticky right sidebar with IntersectionObserver scroll tracking |
| `StatusBadge` | 37 | status, type? | Colored badge using `--badge-{type}` CSS variables |
| `ThemeToggle` | 32 | (none) | Cycles light → dark → auto |
| `BreadcrumbNav` | 44 | path, title, type | Home / Type / Title breadcrumbs |

## Routes

| Route | Server Load | Purpose |
|-------|-------------|---------|
| `/` | (uses layout data) | Landing page: type cards grid, recent documents, quick search |
| `/doc/[...path]` | `readDocument()` | Document viewer with prose rendering, TOC, raw toggle |
| `/search` | (client-side) | Search page with facets and URL-synced filters |
| `GET /api/search` | — | Full-text search endpoint |
| `GET /api/docs` | — | Filtered document listing |
| `POST /api/manifest` | — | Regenerate manifest |

## CSS Architecture

`src/app.css` (387 lines) defines the entire visual system through CSS custom properties. The light theme is set on `:root`, dark theme on `[data-theme="dark"]`. The `+layout.svelte` component sets the `data-theme` attribute on `document.documentElement` via `$effect`.

Typography uses three Google Fonts: Source Sans 3 (body), Source Serif 4 (headings), JetBrains Mono (code). The `.prose` class handles all rendered Markdown content with appropriate spacing, sizing, and element styling.

Badge colors are type-specific CSS variables (`--badge-adr: #7c3aed`, `--badge-spec: #2563eb`, etc.) referenced by the `StatusBadge` component.

## Testing

42 vitest tests across 5 test files in `tests/lib/server/`:

| File | Tests | Covers |
|------|-------|--------|
| `config.test.ts` | 6 | DOCS_ROOT resolution, config loading, type defaults, merging |
| `docs.test.ts` | 12 | scanDocs (count, filtering, types, tags, IDs, sorting), readDocument (parsing, headings, 404) |
| `markdown.test.ts` | 9 | HTML output, GFM tables, task lists, code highlighting, slug IDs, bold/italic, links, blockquotes |
| `manifest.test.ts` | 5 | Generation, disk write, caching, invalidation, count consistency |
| `search.test.ts` | 10 | Index build, title search, response structure, empty query, type filter, snippets, field prefixes, combined search, facets |

Tests use dynamic `await import()` with `vi.resetModules()` to handle module caching. The `$env/dynamic/private` SvelteKit module is aliased to `tests/mocks/env.ts` (which exports `process.env`) in `vite.config.ts`.
