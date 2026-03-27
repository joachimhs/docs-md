---
title: "API Reference"
type: spec
status: approved
created: "2026-03-27"
updated: "2026-03-27"
tags: [api, endpoints, reference]
owner: "@specmd"
---

# API Reference

spec.md exposes REST API endpoints for programmatic access to documentation.

## Search

### `GET /api/search`

Full-text search across all documents.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | required | Search query. Supports field prefixes. |
| `type` | string | — | Filter by document type |
| `status` | string | — | Filter by status |
| `tag` | string | — | Filter by tag |
| `limit` | number | 50 | Maximum results to return |

**Field-Specific Queries:**

The `q` parameter supports inline field prefixes:

```
type:adr                    # All ADRs
tag:security                # Docs tagged "security"
type:spec PostgreSQL        # Specs mentioning PostgreSQL
status:draft owner:alice    # Alice's drafts
```

**Response:**

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

## Documents

### `GET /api/docs`

List all documents with optional filtering and sorting.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | — | Filter by document type |
| `status` | string | — | Filter by status |
| `tag` | string | — | Filter by tag |
| `owner` | string | — | Filter by owner |
| `sort` | string | `title` | Sort field (title, type, status, created, updated) |
| `order` | string | `asc` | Sort order (asc, desc) |

**Response:**

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

## Manifest

### `POST /api/manifest`

Regenerate the document manifest from the filesystem.

**Request Body:** None

**Response:**

```json
{
  "document_count": 11,
  "generated": "2026-03-27T10:30:00.000Z"
}
```

Use this after adding or modifying documents outside the UI to refresh the index.
