---
title: "docs.md"
type: doc
status: active
created: "2026-03-27"
updated: "2026-03-27"
tags: [overview]
---

# docs.md

docs.md is a documentation authoring tool built on SvelteKit 2 and Svelte 5. It reads Markdown files with YAML frontmatter from a `docs/` folder, serves them as a navigable web application, and provides a full editing and Git integration layer.

## Current State (Phase 2 Complete)

Phases 1 and 2 are implemented. docs.md is a complete local documentation authoring tool.

### Browsing

- Sidebar navigation grouped by document type with collapsible sections
- Full-text search via FlexSearch with field-specific queries (`type:adr`, `tag:security`, `status:draft`)
- Markdown rendering with GFM support (tables, task lists, strikethrough, autolinks)
- Syntax highlighting via Shiki with paired github-light and github-dark themes
- YAML frontmatter with structured metadata display (badges, dates, tags, owners)
- Table of contents auto-generated from headings with scroll tracking
- Light/dark/auto theme with `prefers-color-scheme` detection and localStorage persistence
- Responsive layout with mobile sidebar overlay

### Editing

- Dual-mode editor: WYSIWYG (Milkdown/Crepe) and Markdown source (CodeMirror)
- Structured frontmatter form — title, type, status, owner, tags — no raw YAML exposure
- Live Markdown preview pane (debounced, server-rendered)
- Image paste/drop upload in both editors
- Keyboard shortcuts: `Ctrl+B` (bold), `Ctrl+I` (italic), `Ctrl+K` (link), `Ctrl+S` (save)
- New document creation workflow with type selection and sequential naming
- Document archiving (soft-delete to `_archive/`)

### Git Integration

- Save to disk, commit with message, push to remote — all from the editor toolbar
- Git status indicators in header: branch name, modified count, ahead/behind
- Modified document dots in sidebar
- Git history timeline per document with commit entries
- Side-by-side and unified diff viewer using diff2html
- View file content at any historical commit

### What's Planned

- Phase 3: npm CLI packaging (`docsmd browse`, `docsmd init`), AI agent discoverability
- Phase 4: Authentication (OAuth + simple auth), static site export, Docker deployment, file watcher

## Running the Application

```bash
npm install
DOCSMD_DOCS_DIR=docs npm run dev
```

Opens at `http://localhost:5176`. Set `DOCSMD_DOCS_DIR=test-docs` to browse the sample documentation.

To point at another repository:

```bash
DOCSMD_REPO_ROOT=/path/to/repo npm run dev
```

## Project Layout

```
docsmd/
  src/
    lib/
      types/index.ts              10 TypeScript interfaces
      server/                     6 server-only modules (config, docs, git, markdown, manifest, search)
      stores/                     4 Svelte 5 runes stores (docs, git, search, ui)
      components/                 16 Svelte components
    routes/
      +layout.server.ts           Loads manifest and config
      +layout.svelte              App shell (header with git status, sidebar, main, footer)
      +page.svelte                Landing page with type reference and agent instructions
      doc/[...path]/              Document viewer
      edit/[...path]/             Document editor (dual-mode)
      new/                        New document creation workflow
      search/                     Search results page
      history/[...path]/          Git commit history timeline
      diff/[...path]/             Git diff viewer
      api/
        docs/                     Document listing + creation
        docs/[id]/                Single document GET/PUT/DELETE
        git/status/               Git status
        git/history/              File commit history
        git/diff/                 File diff
        git/commit/               Commit changes
        git/push/                 Push to remote
        assets/                   Image upload
        assets/[...filename]/     Image serving
        preview/                  Markdown → HTML rendering
        search/                   Full-text search
        manifest/                 Manifest regeneration
  test-docs/                      11 sample documents for development
  docs/                           This documentation
  tests/                          72 vitest tests covering all server modules
```
