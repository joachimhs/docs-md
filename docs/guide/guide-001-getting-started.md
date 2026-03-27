---
title: "Getting Started"
type: guide
status: active
created: "2026-03-27"
updated: "2026-03-27"
tags: [setup, development]
---

# Getting Started

## Prerequisites

- Node.js 20+
- npm

## Install and Run

```bash
cd docsmd
npm install
DOCSMD_DOCS_DIR=docs npm run dev
```

The dev server starts at `http://localhost:5176` (configured in `vite.config.ts` under `server.port`).

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DOCSMD_REPO_ROOT` | `process.cwd()` | Root directory. `DOCS_ROOT` is resolved relative to this. |
| `DOCSMD_DOCS_DIR` | `docs` | Name of the documentation directory inside `DOCSMD_REPO_ROOT`. |

These are read in `src/lib/server/config.ts`. In production they come from `$env/dynamic/private`; in tests they come from `process.env` (vitest sets `DOCSMD_DOCS_DIR=test-docs` via `vite.config.ts`).

## Adding a Document

Create a Markdown file in the appropriate type subfolder under your docs directory:

```markdown
---
title: "Use Redis for Session Storage"
type: adr
status: proposed
owner: "@alice"
created: "2026-03-27"
tags: [infrastructure, caching]
---

# Use Redis for Session Storage

## Context
...
```

The `title` field is the only required frontmatter field. If `type` is omitted, it is inferred from the parent folder name (`adr/` → `adr`). Files at the docs root get type `doc`.

The document appears in the sidebar after a page refresh. The server regenerates the manifest (`_manifest.json`) on startup or when `POST /api/manifest` is called.

## File Naming

The convention is `{type}-{NNN}-{slug}.md`:

```
docs/adr/adr-001-use-postgresql.md
docs/spec/spec-002-notification-pipeline.md
docs/guide/guide-001-getting-started.md
```

The `{NNN}` number controls ordering within a type group. The slug is a hyphenated summary. Document IDs are derived from the filename — `adr-001-use-postgresql.md` gets ID `adr-001-use-postgresql`.

## Search

The search bar in the header (or `Ctrl+K` / `Cmd+K`) performs full-text search across titles, body text, tags, headings, and owners.

Field-specific prefixes narrow results:

| Syntax | Effect |
|--------|--------|
| `type:adr` | Only ADR documents |
| `tag:security` | Documents tagged "security" |
| `status:draft` | Only drafts |
| `owner:alice` | Documents owned by alice |
| `type:adr PostgreSQL` | ADRs mentioning PostgreSQL |

These prefixes are parsed by `parseFieldPrefixes()` in `src/lib/server/search.ts` using regex extraction before the remaining text hits FlexSearch.

## Running Tests

```bash
npm test              # vitest run (42 tests)
npm run check         # svelte-kit sync + svelte-check
```

Tests cover all 5 server modules. They use `test-docs/` as the document source (configured via the `DOCSMD_DOCS_DIR` env var in `vite.config.ts`). The `$env/dynamic/private` SvelteKit module is aliased to `tests/mocks/env.ts` which re-exports `process.env`.

## Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite dev` | Start dev server on port 5176 |
| `build` | `vite build` | Build for production |
| `preview` | `vite preview` | Preview production build |
| `test` | `vitest run` | Run test suite |
| `check` | `svelte-kit sync && svelte-check` | TypeScript type checking |
| `check:watch` | same, with `--watch` | Continuous type checking |
