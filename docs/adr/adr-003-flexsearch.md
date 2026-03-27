---
title: "Use FlexSearch for Full-Text Search"
type: adr
status: accepted
owner: "@specmd"
created: "2026-03-26"
updated: "2026-03-27"
tags: [search, architecture]
decision_date: "2026-03-26"
---

# Use FlexSearch for Full-Text Search

## Context

spec.md needs fast, in-memory full-text search across all documents. The search must support multi-field querying (title, body, tags, headings) and return results within 200ms.

## Decision

We use FlexSearch in Document mode, which indexes multiple fields per document and allows field-weighted search.

Indexed fields: `title`, `body` (stripped of Markdown formatting), `tags`, `headings`, `owner`.

On top of FlexSearch, we added a custom field-prefix parser that extracts `type:adr`, `tag:security`, `status:draft`, and `owner:alice` from the query string before passing the remaining text to FlexSearch. This allows combining structured and free-text search in a single query.

## Consequences

### Positive

- Zero external dependencies (no search server needed)
- Fast: search results within 50ms for typical documentation sizes (100-500 docs)
- Small footprint: the index lives in memory on the Node.js server
- Field-specific prefixes give power users precise filtering without a separate UI

### Negative

- Memory-resident index means search state is lost on server restart (rebuilt on first query)
- FlexSearch's Document mode API has limited TypeScript support
- No fuzzy matching out of the box (FlexSearch's tokenizer provides prefix matching)
- Scaling limit: not suitable for tens of thousands of documents (fine for project documentation)

## Alternatives Considered

### Lunr.js

More established but slower for large indexes and lacks Document mode for multi-field search.

### MiniSearch

Good alternative with better TypeScript support. Could be reconsidered if FlexSearch's API causes issues.

### Server-side search (SQLite FTS, Meilisearch)

Overkill for a documentation browser that typically has fewer than 500 documents. Adds deployment complexity.
