---
title: "Configuration"
type: guide
status: active
created: "2026-03-27"
updated: "2026-03-27"
tags: [configuration, customization]
---

# Configuration

docs.md is configured through a `.docsmd.yml` file placed in the root of your docs directory.

## Config File Location

```
your-repo/
  docs/
    .docsmd.yml    <-- configuration goes here
    overview.md
    adr/
    guide/
    ...
```

## Full Schema

```yaml
spec_version: "0.1.0"

project:
  name: "My Project"
  description: "Project documentation"
  logo: "logo.svg"          # Optional, relative to docs/

types:
  # Override or extend default types
  custom-type:
    label: "Custom"
    plural: "Custom Documents"
    folder: "custom"
    statuses: ["draft", "active", "archived"]
    default_status: "draft"
    icon: "file"

search:
  fuzzy_threshold: 0.6      # 0-1, lower = stricter matching
  result_limit: 50           # Max search results
  snippet_length: 200        # Characters in search snippets

ui:
  theme: "auto"              # "light", "dark", or "auto"
  sidebar_default: "expanded" # "expanded" or "collapsed"
  default_editor: "richtext"  # "richtext" or "markdown" (Phase 2)
```

## Default Document Types

docs.md ships with 8 built-in types. You don't need to configure them unless you want to customize:

| Type | Label | Statuses |
|------|-------|----------|
| `adr` | ADR | proposed, accepted, rejected, deprecated, superseded |
| `spec` | Spec | draft, review, approved, implemented, deprecated |
| `guide` | Guide | draft, active, outdated, archived |
| `runbook` | Runbook | draft, active, outdated |
| `api` | API | draft, active, deprecated |
| `rfc` | RFC | draft, discussion, accepted, rejected, withdrawn |
| `meeting` | Meeting | draft, final |
| `doc` | Document | draft, active, archived |

## Adding Custom Types

Add a new key under `types` in your `.docsmd.yml`:

```yaml
types:
  postmortem:
    label: "Postmortem"
    plural: "Postmortems"
    folder: "postmortem"
    statuses: ["draft", "reviewed", "published"]
    default_status: "draft"
    icon: "alert-triangle"
```

Then create the corresponding folder: `docs/postmortem/`.

## Frontmatter Fields

Every document supports these frontmatter fields:

### Required

- **`title`** — Document title (the only truly required field)

### Standard

- **`type`** — Document type (inferred from folder if omitted)
- **`status`** — Current status (defaults to the type's `default_status`)
- **`owner`** — Author or owner (convention: `@username`)
- **`created`** — Creation date (ISO 8601: `"2026-03-27"`)
- **`updated`** — Last update date
- **`tags`** — Array of tags: `[architecture, database]`
- **`id`** — Unique identifier (auto-generated from filename if omitted)
- **`summary`** — Short summary (auto-extracted from first paragraph if omitted)

### Extended

- **`priority`** — Priority level
- **`assignee`** — Assigned person(s)
- **`due_date`** — Due date
- **`supersedes`** / **`superseded_by`** — Document relationships
- **`related`** — Array of related document IDs
- **`version`** — Document version
- **`decision_date`** — For ADRs
- **`participants`** — For meetings and ADRs

Any additional frontmatter keys are preserved and displayed in the document viewer.

## Manifest

docs.md generates a `_manifest.json` file in the docs root. This file is a complete index of all documents and is used for sidebar navigation, search indexing, and the landing page. It is regenerated automatically when the server starts and can be refreshed via the `POST /api/manifest` endpoint.
