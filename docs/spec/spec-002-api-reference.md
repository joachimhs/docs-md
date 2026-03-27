---
title: "API Reference"
type: spec
status: approved
created: "2026-03-27"
updated: "2026-03-27"
tags: [api, endpoints]
owner: "@docsmd"
---

# API Reference

Three endpoints in `src/routes/api/`. All return JSON.

## GET /api/search

Full-text search across all documents. Implemented in `src/routes/api/search/+server.ts` (26 lines), delegates to `searchDocs()` in `src/lib/server/search.ts`.

### Parameters

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `q` | yes | — | Search query. Returns empty response if blank. Supports field prefixes. |
| `type` | no | — | Filter results to this document type |
| `status` | no | — | Filter results to this status |
| `tag` | no | — | Filter results containing this tag |
| `limit` | no | 50 | Maximum results |

### Field Prefixes in `q`

The `q` value can include `type:`, `tag:`, `status:`, `owner:` prefixes. These are extracted before the remaining text is sent to FlexSearch. They merge with (and are overridden by) explicit query params.

```
q=type:adr PostgreSQL     →  searches "PostgreSQL" within ADRs only
q=tag:security            →  all docs tagged "security" (no free-text query)
q=status:draft owner:bob  →  all of Bob's drafts
```

### Response

```json
{
  "query": "PostgreSQL",
  "total": 1,
  "results": [
    {
      "id": "adr-001-use-postgresql",
      "title": "Use PostgreSQL as Primary Database",
      "type": "adr",
      "status": "accepted",
      "path": "adr/adr-001-use-postgresql.md",
      "score": 2,
      "snippet": "...decided to use <mark>PostgreSQL</mark> as our primary...",
      "tags": ["database", "infrastructure"],
      "updated": "2026-02-10"
    }
  ],
  "facets": {
    "type": { "adr": 3, "spec": 2, "guide": 2 },
    "status": { "accepted": 1, "draft": 3 },
    "tags": { "database": 1, "security": 2 }
  }
}
```

The `score` reflects how many FlexSearch fields matched (title match = higher score). The `snippet` contains raw HTML with `<mark>` tags around matching terms. Facets reflect the full corpus, not just search results.

## GET /api/docs

List documents from the manifest with optional filtering and sorting. Implemented in `src/routes/api/docs/+server.ts` (29 lines).

### Parameters

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `type` | no | — | Filter by document type |
| `status` | no | — | Filter by status |
| `tag` | no | — | Filter by tag (exact match against tags array) |
| `owner` | no | — | Filter by owner |
| `sort` | no | `title` | Sort field: any ManifestEntry key |
| `order` | no | `asc` | Sort direction: `asc` or `desc` |

### Response

Array of `ManifestEntry` objects:

```json
[
  {
    "id": "adr-001-use-postgresql",
    "title": "Use PostgreSQL as Primary Database",
    "type": "adr",
    "status": "accepted",
    "owner": "@alice",
    "created": "2025-11-15",
    "updated": "2026-02-10",
    "tags": ["database", "infrastructure"],
    "path": "adr/adr-001-use-postgresql.md",
    "summary": "We evaluated several database options...",
    "word_count": 342
  }
]
```

## POST /api/manifest

Force-regenerate `_manifest.json` from the filesystem. Implemented in `src/routes/api/manifest/+server.ts` (12 lines). No request body.

### Response

```json
{
  "document_count": 11,
  "generated": "2026-03-27T10:30:00.000Z"
}
```

Useful after adding or modifying documents outside the running server. The manifest is also regenerated automatically on first access if the cached version is missing.
