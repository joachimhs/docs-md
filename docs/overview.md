---
title: "docs.md"
type: doc
status: active
created: "2026-03-27"
updated: "2026-03-27"
tags: [overview]
---

# docs.md

docs.md is a documentation browser built on SvelteKit 2 and Svelte 5. It reads Markdown files with YAML frontmatter from a `docs/` folder in any directory and serves them as a web application with sidebar navigation, full-text search, syntax-highlighted code blocks, and light/dark themes.

## Current State (Phase 1)

Phase 1 implements a **read-only browser**. The application can scan, parse, index, and display documentation but cannot edit or create documents through the UI.

### What works

- Sidebar navigation grouped by document type with collapsible sections
- Full-text search via FlexSearch with field-specific queries (`type:adr`, `tag:security`, `status:draft`)
- Markdown rendering with GFM support (tables, task lists, strikethrough, autolinks)
- Syntax highlighting via Shiki with paired github-light and github-dark themes
- YAML frontmatter parsing with structured metadata display (badges, dates, tags, owners)
- Table of contents auto-generated from headings with scroll tracking
- Light/dark/auto theme with `prefers-color-scheme` detection and localStorage persistence
- Responsive layout — sidebar becomes a fixed overlay with backdrop on viewports under 768px
- Global keyboard shortcut: `Ctrl+K` / `Cmd+K` focuses the search bar
- Three REST API endpoints: search, document listing, manifest regeneration

### What's planned

- Phase 2: Dual-mode editor (WYSIWYG + Markdown source), Git integration (history, diffs, commit, push)
- Phase 3: npm CLI packaging (`docsmd browse`, `docsmd init`), AI agent discoverability
- Phase 4: Authentication (OAuth + simple auth), static site export, Docker deployment, file watcher

## Running the Application

```bash
npm install
DOCSMD_DOCS_DIR=docs npm run dev
```

Opens at `http://localhost:5176`. The `DOCSMD_DOCS_DIR` variable tells the server which folder to read. Set it to `test-docs` to browse the sample documentation included for development testing.

To point at documentation in another repository:

```bash
DOCSMD_REPO_ROOT=/path/to/repo npm run dev
```

## Project Layout

```
docsmd/
  src/
    lib/
      types/index.ts            10 TypeScript interfaces
      server/                   5 server-only modules (config, docs, markdown, manifest, search)
      stores/                   3 Svelte 5 runes stores (docs, search, ui)
      components/               9 Svelte components
    routes/
      +layout.server.ts         Loads manifest and config
      +layout.svelte            App shell (header, sidebar, main, footer)
      +page.svelte              Landing page
      doc/[...path]/            Document viewer
      search/                   Search results page
      api/                      REST endpoints (search, docs, manifest)
  test-docs/                    11 sample documents for development
  docs/                         This documentation
  tests/                        42 vitest tests covering all server modules
```
