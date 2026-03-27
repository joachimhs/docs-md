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

15 endpoints in `src/routes/api/`. All return JSON unless noted.

## Search

### `GET /api/search`

Full-text search across all documents.

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `q` | yes | — | Search query. Supports field prefixes (`type:adr`, `tag:security`). |
| `type` | no | — | Filter by document type |
| `status` | no | — | Filter by status |
| `tag` | no | — | Filter by tag |
| `limit` | no | 50 | Maximum results |

Response: `SearchResponse` with `query`, `total`, `results[]`, `facets`.

## Documents

### `GET /api/docs`

List all documents with optional filtering.

| Param | Default | Description |
|-------|---------|-------------|
| `type` | — | Filter by type |
| `status` | — | Filter by status |
| `tag` | — | Filter by tag |
| `owner` | — | Filter by owner |
| `sort` | `title` | Sort field |
| `order` | `asc` | `asc` or `desc` |

Response: `ManifestEntry[]`.

### `POST /api/docs`

Create a new document.

```json
{
  "frontmatter": { "title": "My Doc", "type": "adr", "status": "proposed" },
  "body": "# My Document\n\nContent here."
}
```

Response (201): `{ id, path, filename }`. The filename is auto-generated as `{type}-{NNN}-{slug}.md`.

### `GET /api/docs/[id]`

Read a single document by ID. Returns `{ frontmatter, body, path }`.

With `?at={hash}` query param: returns the document content at that specific git commit instead. Response: `{ content, path, hash }`.

### `PUT /api/docs/[id]`

Update a document. Frontmatter is shallow-merged (existing fields preserved). Body replaces entirely if provided.

```json
{
  "frontmatter": { "status": "accepted" },
  "body": "# Updated content"
}
```

Response: `{ id, path, updated }`. The `updated` date is set automatically.

### `DELETE /api/docs/[id]`

Archive (soft-delete) a document. Moves to `docs/_archive/{original-path}`.

Response: `{ id, archived_path }`.

## Preview

### `POST /api/preview`

Render Markdown to HTML using the same unified pipeline as the document viewer.

```json
{ "markdown": "# Hello **world**" }
```

Response: `{ html: "<h1>Hello <strong>world</strong></h1>" }`.

Used by the live preview pane in the Markdown editor mode.

## Assets

### `POST /api/assets`

Upload an image file. Accepts `multipart/form-data` with a `file` field. Saves to `docs/_assets/{timestamp}-{safename}`.

Response (201): `{ path: "_assets/filename.png", url: "/api/assets/filename.png" }`.

Used by the image paste/drop handlers in both editors.

### `GET /api/assets/[...filename]`

Serve an uploaded image from `docs/_assets/`. Sets `Content-Type` from file extension and `Cache-Control: public, max-age=31536000, immutable`.

## Git

All Git endpoints operate via `simple-git` scoped to the docs directory. Returns `500` with error message if the working directory is not a git repository.

### `GET /api/git/status`

Returns working tree status scoped to docs/ files.

```json
{
  "branch": "main",
  "modified": ["test-docs/overview.md"],
  "added": [],
  "deleted": [],
  "staged": [],
  "ahead": 2,
  "behind": 0,
  "isClean": false
}
```

### `GET /api/git/history`

Commit history for a specific file.

| Param | Required | Default |
|-------|----------|---------|
| `path` | yes | — |
| `limit` | no | 50 |

Response: array of `{ hash, short_hash, author, email, date, message }`.

### `GET /api/git/diff`

Unified diff for a file between commits.

| Param | Required | Description |
|-------|----------|-------------|
| `path` | yes | Doc path relative to docs/ |
| `from` | yes | Commit hash |
| `to` | no | Commit hash (defaults to `from~1..from`) |

Response: `{ diff: "unified diff string" }`.

### `POST /api/git/commit`

Stage and commit document changes.

```json
{
  "message": "docs(adr): update — Use PostgreSQL",
  "files": ["adr/adr-001-use-postgresql.md"],
  "author": { "name": "Alice", "email": "alice@example.com" }
}
```

The manifest is automatically regenerated and staged alongside the document. Response: `{ hash, message }`.

### `POST /api/git/push`

Push committed changes to remote. Only performs fast-forward pushes.

Response: `{ pushed: true, ahead: 0 }` or `{ pushed: false, reason: "nothing to push" }`.

## Manifest

### `POST /api/manifest`

Force-regenerate `_manifest.json` from the filesystem.

Response: `{ document_count, generated }`.
