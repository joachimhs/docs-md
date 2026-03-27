---
title: "CLI Reference"
type: guide
status: active
created: "2026-03-27"
updated: "2026-03-27"
tags: [cli, commands]
---

# CLI Reference

The `docsmd` CLI packages the docs.md web application as a globally installable tool.

```bash
npm i -g docsmd
```

## Commands

### `docsmd browse`

Start the web UI server.

```bash
docsmd browse                    # localhost:5176, opens browser
docsmd browse --port 8080        # custom port
docsmd browse --no-open          # don't open browser
docsmd browse --host 0.0.0.0     # bind to all interfaces
```

**Requirements:** Must be run inside a git repository with a `docs/` directory. If `docs/` doesn't exist, the command suggests running `docsmd init`.

**What it does:**
1. Validates `.git` and `docs/` exist
2. Sets `DOCSMD_REPO_ROOT` to current directory
3. Loads the pre-built SvelteKit handler from `build/handler.js`
4. Starts an HTTP server
5. Opens the browser (unless `--no-open`)

Handles port conflicts with a helpful message suggesting an alternative port. Shuts down cleanly on `Ctrl+C`.

### `docsmd init [name]`

Scaffold the documentation structure in the current git repository.

```bash
docsmd init                      # uses "Documentation" as project name
docsmd init "My Project"         # sets project name
docsmd init "My Project" --ai    # also generates DOCSMD.md
```

**Creates:**

```
docs/
  .docsmd.yml                    # project config
  overview.md                    # welcome page
  adr/                           # Architectural Decision Records
  spec/                          # Technical Specifications
  guide/                         # How-to Guides
  runbook/                       # Operational Runbooks
  api/                           # API Documentation
  rfc/                           # Requests for Comments
  meeting/                       # Meeting Notes
  _templates/                    # 7 document templates
    adr.md, spec.md, guide.md, runbook.md, api.md, rfc.md, meeting.md
  _assets/                       # uploaded images
```

Won't overwrite `docs/.docsmd.yml` if it already exists. Safe to re-run.

**`--ai` flag:** Generates `DOCSMD.md` at the repository root with instructions for AI coding agents. Includes document type table, frontmatter field reference, and reading/writing rules. Designed for inclusion in `CLAUDE.md` or `AGENTS.md`.

### `docsmd manifest`

Print a summary of all documents found in `docs/`.

```bash
docsmd manifest
```

Output:
```
  docs.md — 12 documents

  adr          3
  guide        2
  meeting      1
  rfc          1
  runbook      1
  spec         2
  doc          2
```

Uses a standalone scanner (`cli/lib/scan.ts`) that parses frontmatter with gray-matter. Skips files without a `title` field and directories starting with `_` or `.`.

### `docsmd search <query>`

Full-text search across all documents.

```bash
docsmd search "PostgreSQL"
docsmd search "authentication" --type adr
docsmd search "deployment" --status active
docsmd search "query" --plain          # tab-separated for scripting
docsmd search "query" --limit 20
```

**Options:**

| Flag | Description |
|------|-------------|
| `-t, --type <type>` | Filter by document type |
| `-s, --status <status>` | Filter by status |
| `--plain` | Machine-readable tab-separated output |
| `-l, --limit <n>` | Max results (default: 10) |

Builds a FlexSearch Document index over title, body, and tags fields. The body text is stripped of Markdown formatting before indexing. Results show title, type, status, path, and a snippet.

**Plain output format** (for scripting/agents):
```
adr-001-use-postgresql	Use PostgreSQL	adr	accepted	adr/adr-001-use-postgresql.md
```

## Build Pipeline

The project has two build steps:

| Script | Tool | Output | Purpose |
|--------|------|--------|---------|
| `build:web` | Vite + adapter-node | `build/` | SvelteKit server + handler.js |
| `build:cli` | tsup | `dist/cli/` | CLI entry point (ESM) |

```bash
npm run build          # runs both
```

Runtime dependencies (`commander`, `chalk`, `open`, `gray-matter`, `flexsearch`, `simple-git`, `js-yaml`) are marked as external in tsup — they're installed alongside the CLI, not bundled.

## npm Package Contents

When published, the package contains:
- `dist/` — compiled CLI
- `build/` — pre-built SvelteKit web app
- `templates/` — document templates copied during `init`
- `package.json`
