---
title: "Configuration Reference"
type: guide
status: active
created: "2026-03-27"
updated: "2026-03-27"
tags: [configuration]
---

# Configuration Reference

Configuration is loaded by `loadConfig()` in `src/lib/server/config.ts`. It reads `.docsmd.yml` from the docs root directory and deep-merges it with built-in defaults. If the file doesn't exist, defaults are used.

## .docsmd.yml

```yaml
spec_version: "0.1.0"

project:
  name: "My Project"          # Shown in header and landing page. Default: "Documentation"
  description: "About this"   # Shown on landing page below the title
  logo: "logo.svg"            # Not yet rendered (Phase 2+)

search:
  fuzzy_threshold: 0.6        # Not currently used (FlexSearch handles its own matching)
  result_limit: 50            # Max results returned by searchDocs()
  snippet_length: 200         # Max characters in search result snippets

ui:
  theme: "auto"               # Initial theme: "light", "dark", or "auto"
  sidebar_default: "expanded" # Not currently wired (sidebar always starts expanded)
  default_editor: "richtext"  # Which editor mode opens by default: "richtext" or "markdown"
```

## Document Types

Eight types are built in. Each defines a folder, display labels, valid statuses, and a default status:

| Key | Label | Folder | Statuses | Default | Icon |
|-----|-------|--------|----------|---------|------|
| `adr` | ADR | `adr/` | proposed, accepted, rejected, deprecated, superseded | proposed | scale |
| `spec` | Spec | `spec/` | draft, review, approved, implemented, deprecated | draft | file-text |
| `guide` | Guide | `guide/` | draft, active, outdated, archived | draft | book-open |
| `runbook` | Runbook | `runbook/` | draft, active, outdated | draft | terminal |
| `api` | API | `api/` | draft, active, deprecated | draft | plug |
| `rfc` | RFC | `rfc/` | draft, discussion, accepted, rejected, withdrawn | draft | message-square |
| `meeting` | Meeting | `meeting/` | draft, final | draft | users |
| `doc` | Document | (root) | draft, active, archived | draft | file |

The icon values are Lucide icon names — not yet rendered as actual icons in Phase 1 (the sidebar shows `[ADR]`-style text placeholders).

### Adding a custom type

Add a key under `types` in `.docsmd.yml`:

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

Then create `docs/postmortem/` and add `.md` files there. Custom types merge with (don't replace) the built-in types.

## Frontmatter Fields

### Required

- **`title`** — Documents without a title are silently skipped by `scanDocs()`.

### Standard (used by the UI)

| Field | Type | Used by |
|-------|------|---------|
| `type` | string | Badge color, sidebar grouping, search filtering. Inferred from folder if omitted. |
| `status` | string | Badge display, search filtering. Defaults to the type's `default_status`. |
| `owner` | string | Shown in doc header. Convention: `@username`. |
| `created` | string | Shown in doc header, formatted with `Intl.DateTimeFormat`. |
| `updated` | string | Shown in doc header. Used for "recently updated" sort on landing page. |
| `tags` | string[] | Rendered as clickable pills linking to `/search?tag=X`. Indexed for search. |
| `id` | string | Unique document identifier. Auto-generated from filename if omitted. |
| `summary` | string | Shown in manifest. Auto-extracted from first paragraph if omitted (max 200 chars). |

### Extended (stored in frontmatter, shown in doc header if present)

`priority`, `assignee`, `due_date`, `supersedes`, `superseded_by`, `related`, `version`, `audience`, `decision_date`, `participants`, `template`

Any unknown frontmatter keys are preserved via the `[key: string]: unknown` index signature on `DocFrontmatter`.

## Manifest

`_manifest.json` is written to the docs root by `generateManifest()`. It contains an array of `ManifestEntry` objects for every document found by `scanDocs()`. The manifest drives:

- Sidebar navigation (grouped by type, sorted by type then title)
- Landing page type cards and recent documents
- Search index population
- Facet counts

The manifest is cached in memory. It regenerates automatically on first access if the file is missing. Call `POST /api/manifest` to force regeneration, or restart the dev server.
