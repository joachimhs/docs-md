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
- **Svelte 5** — exclusively runes API (`$state`, `$derived`, `$props`, `$effect`). No legacy stores.
- **TypeScript** in strict mode with `bundler` module resolution
- **unified** ecosystem for Markdown: remark-parse, remark-gfm, remark-rehype, rehype-shiki, rehype-slug, rehype-stringify
- **Shiki** for syntax highlighting with dual themes (github-light + github-dark)
- **FlexSearch** 0.7 in Document mode for full-text search
- **gray-matter** for YAML frontmatter parsing and serialization
- **simple-git** for Git operations (status, history, diff, commit, push)
- **@milkdown/crepe** for WYSIWYG Markdown editing
- **CodeMirror 6** for Markdown source editing
- **diff2html** for rendering Git diffs
- **commander** for CLI command parsing
- **chalk** for terminal output styling
- **tsup** for CLI bundling (ESM, externals)
- **vitest** for unit testing

## Two Codebases

The project has two separate codebases with separate build steps:

1. **`src/`** — SvelteKit web application, built with Vite + adapter-node → `build/`
2. **`cli/`** — Node.js CLI, built with tsup → `dist/cli/`

The CLI cannot import from `$lib/server/` (SvelteKit module aliases don't exist outside Vite). Instead, `cli/lib/scan.ts` duplicates the core document scanning logic using only `gray-matter` and `node:fs`. The web app and CLI share runtime dependencies (`gray-matter`, `flexsearch`, `simple-git`, `js-yaml`) but are otherwise independent.

The `browse` command bridges them: it starts an HTTP server that loads the pre-built SvelteKit handler from `build/handler.js`.

## Project Structure

```
docsmd/
  cli/                              CLI source (separate from SvelteKit)
    index.ts                        Commander.js entry: browse, init, manifest, search
    commands/
      browse.ts                     Start pre-built SvelteKit server
      init.ts                       Scaffold docs/ folder + templates
      manifest.ts                   Print document summary
      search.ts                     FlexSearch-powered terminal search
    lib/
      scan.ts                       Standalone doc scanner (no $lib)
      logger.ts                     Chalk output helpers
  templates/                        Bundled document templates (7 types + config)
  src/
    lib/
      types/index.ts              All TypeScript interfaces
      server/
        config.ts                 REPO_ROOT, DOCS_ROOT, loadConfig()
        docs.ts                   scanDocs(), readDocument(), CRUD ops
        git.ts                    Git operations via simple-git
        markdown.ts               renderMarkdown() unified pipeline
        manifest.ts               generateManifest(), getManifest()
        search.ts                 buildSearchIndex(), searchDocs()
      stores/
        docs.svelte.ts            Document manifest state
        git.svelte.ts             Git status state
        search.svelte.ts          Search state with debounce
        ui.svelte.ts              Theme, sidebar state
      components/
        # Browsing (Phase 1)
        Sidebar.svelte            Type-grouped nav with modified dots
        SearchBar.svelte          Header search with instant dropdown
        SearchResults.svelte      Result list with snippets
        SearchFacets.svelte       Filter checkboxes
        DocHeader.svelte          Document metadata display
        TableOfContents.svelte    Heading-based TOC with scroll tracking
        StatusBadge.svelte        Type/status colored badges
        ThemeToggle.svelte        Light/dark/auto cycle
        BreadcrumbNav.svelte      Home / Type / Title
        # Editing (Phase 2)
        FrontmatterForm.svelte    Structured frontmatter editor
        MilkdownEditor.svelte     WYSIWYG via @milkdown/crepe
        CodeMirrorEditor.svelte   Markdown source with keybindings
        MarkdownPreview.svelte    Live preview via /api/preview
        DocEditor.svelte          Dual-mode orchestrator
        EditorToolbar.svelte      Mode toggle + save/commit/push
        EditorStatusBar.svelte    Word count + dirty state
    routes/
      +layout.server.ts           Loads manifest + config
      +layout.svelte              App shell with git indicators
      +page.svelte                Landing page
      doc/[...path]/              Document viewer
      edit/[...path]/             Document editor
      new/                        New document workflow
      search/                     Search page
      history/[...path]/          Git history timeline
      diff/[...path]/             Git diff viewer
      api/                        15 REST endpoints
  tests/                          72 vitest tests
```

## Server Modules

All in `src/lib/server/`. Never imported by client code.

### config.ts

Reads `DOCSMD_REPO_ROOT` and `DOCSMD_DOCS_DIR` from environment variables. Loads `.docsmd.yml` from the docs root and merges with built-in defaults for 8 document types. Exports `REPO_ROOT`, `DOCS_ROOT`, and `loadConfig()`.

### docs.ts

The largest server module. Read operations: `scanDocs()` recursively walks `DOCS_ROOT`, `readDocument()` parses and renders a single file. Write operations: `createDocument()` generates sequential filenames and writes to disk, `updateDocument()` merges frontmatter and replaces body, `archiveDocument()` moves files to `_archive/`. Helper functions: `slugify()`, `getNextSequence()`, `extractHeadings()`, `extractFirstParagraph()`.

Frontmatter is serialized with `gray-matter`'s `matter.stringify(body, frontmatter)`. All write operations regenerate the manifest.

### git.ts

Wraps `simple-git` with the working directory set to `REPO_ROOT`. All operations are scoped to files under `DOCS_ROOT`.

- `isGitRepo()` — checks if REPO_ROOT is a valid git repository
- `getDocsStatus()` — branch name, modified/added/deleted/staged files (filtered to docs prefix), ahead/behind counts
- `getFileHistory(docPath, limit)` — commit log for a specific file
- `getFileDiff(docPath, fromHash, toHash?)` — unified diff between commits
- `getFileAtCommit(docPath, hash)` — file content at a specific commit via `git show`
- `commitDocChange(docPath, message, author?)` — stages document + regenerated manifest, commits
- `pushChanges()` — fast-forward push only, returns `{ pushed: false, reason }` if nothing to push

### markdown.ts

Cached unified processor pipeline: `remarkParse → remarkGfm → remarkRehype → rehypeShiki → rehypeSlug → rehypeStringify`. First invocation takes ~2.4s (Shiki loading); subsequent calls are fast. Also used by the `/api/preview` endpoint for the live editor preview.

### manifest.ts

In-memory document index. `generateManifest()` calls `scanDocs()` and caches the result. `getManifest()` returns cache or regenerates. `invalidateManifest()` clears the cache. Nothing is written to disk — the manifest exists only in the server process. All CRUD operations in docs.ts call invalidate + regenerate. The file watcher (`watcher.ts`) also calls `invalidateManifest()` when external changes are detected.

### watcher.ts

Watches `docs/**/*.md` with chokidar for external file changes (from editors, AI agents, git operations). When a `.md` file is added, changed, or removed, the manifest and search index are invalidated so the next request picks up the new state. Uses `awaitWriteFinish` (300ms stability threshold) to avoid partial-write triggers, and debounces reindexing by 500ms. Started once on first page load from `+layout.server.ts`.

### search.ts

FlexSearch Document index with 5 fields (title, body, tags, headings, owner). `parseFieldPrefixes()` extracts `type:`, `tag:`, `status:`, `owner:` from query strings. `searchDocs()` combines free-text FlexSearch results with filter matching. Includes snippet generation with `<mark>` highlighting.

## CLI Modules

All in `cli/`. Built with tsup separately from the SvelteKit app. Cannot use `$lib` imports.

### cli/lib/scan.ts

Standalone document scanner. Reimplements the core of `src/lib/server/docs.ts` using only `gray-matter` and `node:fs`. Exports `scanDocs(docsRoot): DocEntry[]` which recursively walks a directory, parses `.md` files, infers types from folder names, generates IDs, extracts summaries, and counts words. Used by the `manifest` and `search` commands.

### cli/commands/browse.ts

Loads `build/handler.js` (the pre-built SvelteKit app) and serves it via `http.createServer()`. Sets `DOCSMD_REPO_ROOT` so the web app reads from the correct repository. Validates git repo and docs/ existence before starting.

### cli/commands/init.ts

Scaffolds `docs/` with subfolders, copies templates from the bundled `templates/` directory, writes `.docsmd.yml` and `overview.md`. The `--ai` flag generates `DOCSMD.md` with agent instructions.

### cli/commands/search.ts

Builds a FlexSearch Document index from `scanDocs()` output. Indexes title (forward tokenizer), body (strict, Markdown stripped), and tags (strict). Supports type/status filtering and plain output mode.

## Stores

Four Svelte 5 runes-based singletons in `src/lib/stores/`:

| Store | State | Purpose |
|-------|-------|---------|
| `docs` | manifest, config, byType, types, allTags, recentDocs | Document data from server |
| `git` | branch, modified, added, ahead, behind, isRepo | Git status from `/api/git/status` |
| `search` | query, results, filters, facets, loading | Debounced search execution |
| `ui` | sidebarOpen, theme, resolvedTheme | Theme + sidebar toggle |

## Components

### Browsing (Phase 1)

| Component | Purpose |
|-----------|---------|
| `Sidebar` | Type-grouped navigation tree. Shows orange dots for modified docs via `gitState.isModified()`. |
| `SearchBar` | Header search with 200ms-debounced dropdown (5 results). `Ctrl+K` global focus. |
| `SearchResults` | Result list with `{@html snippet}` highlighting, badges, tags. |
| `SearchFacets` | Checkbox filter panel for type/status/tags with counts. |
| `DocHeader` | Title, type+status badges, owner, dates, tag pills. |
| `TableOfContents` | Sticky right sidebar with IntersectionObserver scroll tracking. |
| `StatusBadge` | Colored badge using `--badge-{type}` CSS variables. |
| `ThemeToggle` | Cycles light → dark → auto. |
| `BreadcrumbNav` | Home / Type / Title breadcrumbs. |

### Editing (Phase 2)

| Component | Purpose |
|-----------|---------|
| `FrontmatterForm` | Structured form: title, type (select), status (context-aware), owner, tags (pill input with add/remove). No raw YAML. |
| `MilkdownEditor` | WYSIWYG via `@milkdown/crepe`. GFM, history, clipboard, slash commands. Image paste/drop uploads to `/api/assets`. Client-only (dynamic import). |
| `CodeMirrorEditor` | Markdown source with syntax highlighting. Keybindings: Ctrl+B/I/K/S. Image paste/drop upload. |
| `MarkdownPreview` | Debounced fetch to `/api/preview`, renders HTML in `.prose` container. |
| `DocEditor` | Orchestrator: manages mode switching (richtext/markdown), body state shared between editors, save/commit/push workflow. |
| `EditorToolbar` | Segmented mode toggle, preview toggle, save/commit/push/history buttons. Buttons enable/disable based on dirty and git state. |
| `EditorStatusBar` | Word count, dirty indicator, last saved timestamp. |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/search?q=...` | GET | Full-text search with filters |
| `/api/docs?type=...` | GET | List documents with optional filters |
| `/api/docs` | POST | Create new document |
| `/api/docs/[id]` | GET | Read single document (supports `?at={hash}` for historical) |
| `/api/docs/[id]` | PUT | Update document (frontmatter + body) |
| `/api/docs/[id]` | DELETE | Archive document (move to `_archive/`) |
| `/api/manifest` | POST | Regenerate manifest |
| `/api/preview` | POST | Render Markdown to HTML |
| `/api/assets` | POST | Upload image (multipart/form-data) |
| `/api/assets/[...filename]` | GET | Serve image with MIME type + cache headers |
| `/api/git/status` | GET | Branch, modified files, ahead/behind |
| `/api/git/history?path=...` | GET | Commit history for a file |
| `/api/git/diff?path=...&from=...` | GET | Unified diff between commits |
| `/api/git/commit` | POST | Stage and commit (message, files, author) |
| `/api/git/push` | POST | Push to remote |

## Data Flow

### Document Editing

1. User navigates to `/edit/{path}` — server loads document, config, and git status
2. `DocEditor` initializes with frontmatter and body, sets default editor mode from config
3. User edits in WYSIWYG or Markdown mode — both editors write to shared `body` state
4. **Save**: `PUT /api/docs/{id}` writes to disk, regenerates manifest, refreshes git state
5. **Commit**: `POST /api/git/commit` stages document + manifest, creates git commit
6. **Push**: `POST /api/git/push` fast-forward pushes to remote

### New Document

1. User navigates to `/new` — server loads config and templates from `_templates/`
2. User selects document type from card grid
3. FrontmatterForm pre-fills with type, user enters title and metadata
4. Filename preview shows: `{type}/{type}-{NNN}-{slug}.md`
5. **Create**: `POST /api/docs` generates sequential filename, writes file, regenerates manifest
6. Redirect to `/edit/{new-path}`

### Git History & Diff

1. User clicks History on a document → `/history/{path}`
2. Client fetches `GET /api/git/history?path={path}` — displays timeline
3. User clicks "View diff" → `/diff/{path}?from={hash}`
4. Client fetches `GET /api/git/diff` — renders with diff2html

## Testing

72 vitest tests across 7 test files in `tests/lib/server/`:

| File | Tests | Covers |
|------|-------|--------|
| `config.test.ts` | 6 | DOCS_ROOT resolution, config loading, merging |
| `docs.test.ts` | 12 | scanDocs, readDocument, headings, 404 handling |
| `docs-crud.test.ts` | 25 | slugify, getNextSequence, createDocument, updateDocument, archiveDocument |
| `markdown.test.ts` | 9 | HTML output, GFM, code highlighting, slug IDs |
| `manifest.test.ts` | 5 | Generation, disk write, caching, invalidation |
| `search.test.ts` | 10 | Index build, title search, field prefixes, facets |
| `git.test.ts` | 5 | isGitRepo, getDocsStatus, getFileHistory, getFileDiff, getFileAtCommit |
