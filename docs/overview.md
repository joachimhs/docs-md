---
title: "docs.md Documentation"
type: doc
status: active
created: "2026-03-27"
updated: "2026-03-27"
tags: [overview, getting-started]
---

# docs.md

A Git-native documentation browser that reads Markdown files with YAML frontmatter from a `docs/` folder and serves them as a navigable, searchable site with light/dark themes.

## What It Does

docs.md turns a folder of Markdown files into a full documentation site with:

- **Sidebar navigation** grouped by document type (ADR, Spec, Guide, etc.)
- **Full-text search** with FlexSearch, including field-specific queries (`type:adr`, `tag:security`)
- **Syntax-highlighted code blocks** via Shiki with dual light/dark themes
- **Frontmatter-driven metadata** — type badges, status, tags, owners, dates
- **Table of contents** auto-generated from headings
- **Light/dark theme** with system preference detection and localStorage persistence
- **Responsive layout** with mobile sidebar overlay

## Quick Start

```bash
cd docsmd
npm install
DOCSMD_DOCS_DIR=docs npm run dev -- --port 5176
```

Then open `http://localhost:5176`.

## How Documents Work

Every document is a Markdown file with YAML frontmatter:

```markdown
---
title: "My Document"
type: adr
status: accepted
owner: "@alice"
created: "2026-03-27"
tags: [architecture, database]
---

# My Document

Content goes here...
```

The `title` field is required. All other fields are optional but recommended.

## Document Types

| Type | Folder | Purpose |
|------|--------|---------|
| ADR | `docs/adr/` | Architectural Decision Records |
| Spec | `docs/spec/` | Technical Specifications |
| Guide | `docs/guide/` | How-to Guides |
| Runbook | `docs/runbook/` | Operational Runbooks |
| API | `docs/api/` | API Documentation |
| RFC | `docs/rfc/` | Requests for Comments |
| Meeting | `docs/meeting/` | Meeting Notes |
| Document | `docs/` (root) | General documents |

## Next Steps

- Read the [Getting Started Guide](guide/guide-001-getting-started) for setup instructions
- See the [Architecture Spec](spec/spec-001-architecture) for technical details
- Check the [Configuration Guide](guide/guide-002-configuration) for customization
