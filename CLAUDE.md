# WORKING WITH GIT

DO NOT commit files to git. The developer manages all commits, ensuring clean history and proper commit messages. This allows for better tracking of changes and accountability.

# Project Documentation (docs.md)

This project uses docs.md for documentation. All documentation lives in the `docs/` directory.

## For AI Agents

### Discovery
Read `docs/_manifest.json` to get a complete inventory of all documents with their IDs, titles, types, statuses, paths, tags, and summaries.

### Reading Documents
Documents are Markdown files with YAML frontmatter. Parse with any YAML frontmatter library (e.g., `gray-matter` for Node.js, `python-frontmatter` for Python):

```
---
title: "Document Title"
type: adr
status: accepted
tags: [tag1, tag2]
---

# Markdown content here
```

### Creating Documents
1. Read the template from `docs/_templates/{type}.md` if it exists
2. Fill in the frontmatter fields (title is required)
3. Write the Markdown body
4. Save to `docs/{type}/{type}-{NNN}-{slug}.md`
5. The manifest auto-updates on next server start, or call `POST /api/manifest`

### Document Types
| Type | Folder | Purpose |
|------|--------|---------|
| adr | docs/adr/ | Architectural Decision Records |
| spec | docs/spec/ | Technical Specifications |
| guide | docs/guide/ | How-to Guides |
| runbook | docs/runbook/ | Operational Runbooks |
| api | docs/api/ | API Documentation |
| rfc | docs/rfc/ | Requests for Comments |
| meeting | docs/meeting/ | Meeting Notes |
| doc | docs/ (root) | General Documents |

### Frontmatter Fields
| Field | Required | Description |
|-------|----------|-------------|
| title | yes | Document title |
| type | no | Document type (inferred from folder if omitted) |
| status | no | Current status (defaults to type's default) |
| owner | no | Author, convention: @username |
| created | no | Creation date, ISO 8601: "2026-03-27" |
| updated | no | Last update date |
| tags | no | Array: [tag1, tag2] |

### Rules
- Do not change the `id` or `created` fields after creation
- Do not rename files (it breaks Git history)
- Update the `updated` date when making changes
- Quote date strings in YAML: `created: "2026-03-27"` (not unquoted)
- The `title` field is required — documents without it are ignored