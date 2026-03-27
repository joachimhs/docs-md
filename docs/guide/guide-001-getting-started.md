---
title: "Getting Started"
type: guide
status: active
created: "2026-03-27"
updated: "2026-03-27"
tags: [setup, development, getting-started]
---

# Getting Started

This guide walks you through setting up docs.md for local development and using it to browse documentation.

## Prerequisites

- Node.js 20 or later
- npm

## Installation

```bash
cd docsmd
npm install
```

## Running the Dev Server

docs.md needs to know where your documentation lives. Set the `DOCSMD_DOCS_DIR` environment variable to point at your docs folder:

```bash
# Browse the project's own docs
DOCSMD_DOCS_DIR=docs npm run dev -- --port 5176

# Browse the test documentation
DOCSMD_DOCS_DIR=test-docs npm run dev -- --port 5176
```

Open `http://localhost:5176` in your browser.

## Pointing at Another Repository

To browse docs from a different Git repository, set `DOCSMD_REPO_ROOT`:

```bash
DOCSMD_REPO_ROOT=/path/to/other/repo npm run dev -- --port 5176
```

This will look for a `docs/` folder at the specified path.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCSMD_REPO_ROOT` | Current directory | Root of the Git repository |
| `DOCSMD_DOCS_DIR` | `docs` | Name of the docs directory relative to repo root |

## Creating Your First Document

1. Create a Markdown file in the appropriate subfolder:

```bash
mkdir -p docs/guide
```

2. Add YAML frontmatter at the top:

```markdown
---
title: "My First Guide"
type: guide
status: draft
created: "2026-03-27"
tags: [example]
---

# My First Guide

Write your content here using standard Markdown.
```

3. The document appears automatically in the sidebar after a page refresh.

## File Naming Convention

Documents follow the pattern: `{type}-{NNN}-{slug}.md`

Examples:
- `adr-001-use-postgresql.md`
- `spec-002-notification-pipeline.md`
- `guide-001-getting-started.md`

The number helps with ordering. The slug should be a short, descriptive, hyphenated name.

## Search

Use the search bar in the header (or press `Ctrl+K` / `Cmd+K`) to search across all documents. You can use field-specific queries:

- `type:adr` — find all ADRs
- `tag:security` — find docs tagged "security"
- `status:draft` — find drafts
- `type:spec PostgreSQL` — find specs mentioning PostgreSQL

## Running Tests

```bash
npm test
```

This runs the vitest test suite covering all server modules (config, docs, markdown, manifest, search).

## Type Checking

```bash
npm run check
```

Runs `svelte-check` across the entire project.
