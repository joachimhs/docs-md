---
title: docs.md
type: doc
status: active
created: '2026-03-27'
updated: '2026-03-27'
tags:
  - overview
---
# docs.md

docs.md is a documentation authoring tool and CLI. It reads Markdown files with YAML frontmatter from a `docs/` folder, serves them as a web application with editing and Git integration, and packages as a globally installable npm CLI. TESTING PART 3

## Current State (Phase 3 Complete)

Phases 1-3 are implemented. docs.md is a distributable documentation tool.

### CLI

```bash
npm i -g docsmd
```

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `docsmd browse`         | Launch the web UI (default port 5176)        |
| `docsmd init [name]`    | Scaffold `docs/` folder in current git repo  |
| `docsmd init --ai`      | Also generate `DOCSMD.md` agent instructions |
| `docsmd manifest`       | Print document count and type breakdown      |
| `docsmd search <query>` | Search docs from the terminal                |

### Web UI — Browsing

* Sidebar navigation grouped by document type

* Full-text search with field-specific queries (`type:adr`, `tag:security`)

* Markdown rendering with GFM, syntax highlighting (Shiki dual themes)

* Frontmatter metadata display (badges, dates, tags, owners)

* Table of contents with scroll tracking

* Light/dark/auto theme

* Responsive layout with mobile sidebar overlay

### Web UI — Editing

* Dual-mode editor: WYSIWYG (Milkdown/Crepe) and Markdown source (CodeMirror)

* Structured frontmatter form — no raw YAML

* Live Markdown preview pane

* Image paste/drop upload

* New document creation with type selection and sequential naming

* Document archiving (soft-delete)

### Web UI — Git

* Save, commit, push from the editor toolbar

* Git status in header (branch, modified count, ahead/behind)

* Modified dots in sidebar

* Git history timeline and diff viewer (unified + side-by-side)

### What's Planned

* Phase 4: Authentication (OAuth + simple auth), static site export, Docker deployment, file watcher

## Quick Start

### Development

```bash
cd docsmd
npm install
DOCSMD_DOCS_DIR=docs npm run dev
```

Opens at `http://localhost:5176`.

### Production (CLI)

```bash
npm run build                    # Build web + CLI
node dist/cli/index.js browse   # Start server
```

Or after `npm i -g docsmd`:

```bash
cd my-project
docsmd init "My Project"
docsmd browse
```

## Project Layout

```
docsmd/
  cli/                              CLI source (built with tsup)
    index.ts                        Commander.js entry point
    commands/                       browse, init, manifest, search
    lib/                            Standalone scanner + logger
  src/                              SvelteKit web application
    lib/
      types/                        TypeScript interfaces
      server/                       7 server modules (incl. file watcher)
      stores/                       4 Svelte 5 runes stores
      components/                   16 Svelte components
    routes/                         Pages + 15 API endpoints
  templates/                        7 document templates + default config
  build/                            SvelteKit adapter-node output (gitignored)
  dist/                             Compiled CLI (gitignored)
  test-docs/                        11 sample documents for testing
  docs/                             This documentation
  tests/                            72 vitest tests
```

