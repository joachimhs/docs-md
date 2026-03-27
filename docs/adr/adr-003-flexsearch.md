---
title: "Use FlexSearch with Field-Prefix Parsing"
type: adr
status: accepted
owner: "@docsmd"
created: "2026-03-26"
updated: "2026-03-27"
tags: [search, architecture]
decision_date: "2026-03-26"
---

# Use FlexSearch with Field-Prefix Parsing

## Context

docs.md needs full-text search across document titles, bodies, tags, headings, and owners. Results must appear within 200ms. The search should also support structured filtering (by type, status, tag, owner) without requiring a separate filter UI.

## Decision

FlexSearch 0.7 in Document mode, augmented with a custom field-prefix parser. The implementation is in `src/lib/server/search.ts` (383 lines — the largest server module).

### FlexSearch Configuration

```typescript
new FlexSearch.Document({
  document: {
    id: 'id',
    index: [
      { field: 'title', tokenize: 'forward' },
      { field: 'body', tokenize: 'strict' },
      { field: 'tags', tokenize: 'strict' },
      { field: 'headings', tokenize: 'forward' },
      { field: 'owner', tokenize: 'strict' },
    ],
  },
});
```

`forward` tokenization matches prefixes (searching "Post" finds "PostgreSQL"). `strict` matches whole tokens only (tags and owners should be exact).

### Field-Prefix Parsing

`parseFieldPrefixes()` uses regex to extract `type:adr`, `tag:security`, `status:draft`, `owner:alice` from the query string. The remaining text becomes the free-text query for FlexSearch. This runs before FlexSearch is queried.

When the query consists entirely of prefixes (e.g., `type:adr` with no free text), the search bypasses FlexSearch entirely and scans the full manifest with filter matching. This ensures `type:adr` returns all ADRs, not just those that match an empty FlexSearch query.

### Result Scoring

FlexSearch returns results per field. A document that matches in both `title` and `body` gets a score of 2; title-only gets 1. Results matching in the `title` field are sorted to the top regardless of score, since title matches are more likely what the user wants.

## Consequences

### Positive

- No external search server needed — the index lives in the Node.js process
- Sub-50ms search latency for typical documentation sizes (100-500 documents)
- Field prefixes give power users precise filtering from the search bar without touching facet checkboxes
- The combined prefix + free-text search (`type:adr PostgreSQL`) is intuitive for developers
- Index rebuilds are fast since Markdown stripping is simple regex-based (not AST-based)

### Negative

- The index is memory-resident and rebuilt on server restart (no persistence)
- FlexSearch's Document mode TypeScript types are weak — the module is imported as `any` in practice
- No fuzzy/typo-tolerant matching — FlexSearch's `forward` tokenizer handles prefixes but not misspellings
- Document bodies are stripped of Markdown formatting with regex (`stripMarkdown()`), which is imperfect — code blocks inside blockquotes or nested structures may leave artifacts in the indexed text
