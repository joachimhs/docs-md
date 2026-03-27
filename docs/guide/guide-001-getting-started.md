---
title: "Getting Started"
type: guide
status: active
created: "2026-03-27"
updated: "2026-03-27"
tags: [setup, development]
---

# Getting Started

## Option A: CLI (for users)

### Install globally

```bash
npm i -g @joachimhskeie/docsmd
```

Requires Node.js 20+.

### Initialize in a git repo

```bash
cd my-project
docsmd init "My Project"
```

This creates:
- `docs/` with subfolders for each document type (`adr/`, `spec/`, `guide/`, etc.)
- `docs/_templates/` with 7 pre-filled templates
- `docs/_assets/` for uploaded images
- `docs/.docsmd.yml` with project name
- `docs/overview.md` welcome page

### Browse

```bash
docsmd browse
```

Opens the web UI at `http://localhost:5176`. Use `--port 8080` for a different port, `--no-open` to skip auto-opening the browser.

### Generate agent instructions

```bash
docsmd init "My Project" --ai
```

Creates `DOCSMD.md` at the repo root with instructions for AI coding agents (document types, frontmatter fields, reading/writing rules).

### CLI search

```bash
docsmd search "authentication"
docsmd search "authentication" --type adr
docsmd search "authentication" --plain    # tab-separated for scripting
```

### Document summary

```bash
docsmd manifest
```

Prints total document count and per-type breakdown.

## Option B: Development (for contributors)

### Prerequisites

- Node.js 20+
- npm
- Git

### Install and run

```bash
cd docsmd
npm install
DOCSMD_DOCS_DIR=docs npm run dev
```

Dev server at `http://localhost:5176`. Set `DOCSMD_DOCS_DIR=test-docs` for sample documentation.

### Build

```bash
npm run build        # builds both web app + CLI
npm run build:web    # SvelteKit adapter-node output → build/
npm run build:cli    # tsup ESM output → dist/cli/
```

### Test the built CLI locally

```bash
node dist/cli/index.js --version
node dist/cli/index.js --help
node dist/cli/index.js browse --no-open
```

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DOCSMD_REPO_ROOT` | `process.cwd()` | Root directory |
| `DOCSMD_DOCS_DIR` | `docs` | Docs directory name relative to repo root |

## Writing Documents

### File naming convention

```
docs/{type}/{type}-{NNN}-{slug}.md
```

Examples: `adr-001-use-postgresql.md`, `guide-003-deployment.md`. The number provides ordering, the slug is descriptive.

### Frontmatter

```yaml
---
title: "Use PostgreSQL as Primary Database"    # required
type: adr                                       # inferred from folder if omitted
status: accepted                                # defaults to type's default
owner: "@alice"
created: "2026-03-27"
updated: "2026-03-27"
tags: [database, infrastructure]
---
```

### Search syntax

| Syntax | Effect |
|--------|--------|
| `type:adr` | Only ADR documents |
| `tag:security` | Documents tagged "security" |
| `status:draft` | Only drafts |
| `type:adr PostgreSQL` | ADRs mentioning PostgreSQL |

Works in both the web UI search bar (`Ctrl+K`) and `docsmd search`.

## Editing

Click **Edit** on any document to open the dual-mode editor. Toggle between Rich Text (WYSIWYG) and Markdown (source + preview). Save writes to disk, Commit creates a git commit, Push pushes to remote. See the [Configuration Reference](guide/guide-002-configuration) for the `default_editor` setting.

## Live File Watching

The server automatically detects when `.md` files in docs/ are changed externally (by your editor, an AI agent, a git pull, etc.). The sidebar, search, and landing page update on the next page load — no restart needed.

## Running Tests

```bash
npm test              # 72 vitest tests
npm run check         # svelte-check type verification
```
