---
title: "Use unified/remark/rehype for Markdown"
type: adr
status: accepted
owner: "@docsmd"
created: "2026-03-26"
updated: "2026-03-27"
tags: [markdown, rendering]
decision_date: "2026-03-26"
---

# Use unified/remark/rehype for Markdown

## Context

docs.md renders Markdown documents to HTML. The pipeline must handle GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks), syntax-highlighted code blocks, and heading anchor IDs.

## Decision

The unified ecosystem with this exact plugin chain in `src/lib/server/markdown.ts`:

```
remarkParse → remarkGfm → remarkRehype → rehypeShiki → rehypeSlug → rehypeStringify
```

Six plugins, each doing one thing:

| Plugin | Purpose |
|--------|---------|
| `remark-parse` | Markdown text → mdast (Markdown AST) |
| `remark-gfm` | Adds GFM node types to mdast |
| `remark-rehype` | mdast → hast (HTML AST). `allowDangerousHtml: true` preserves raw HTML in source. |
| `@shikijs/rehype` | Walks hast code blocks, applies Shiki highlighting with dual themes |
| `rehype-slug` | Adds `id` attributes to heading elements matching their text slug |
| `rehype-stringify` | hast → HTML string |

The processor is created once and cached at module level. The first call to `renderMarkdown()` takes ~2.4 seconds (Shiki loads grammar and theme data). All subsequent calls use the cached processor and complete in milliseconds.

Shiki is configured with paired themes (`github-light` and `github-dark`). It generates inline `style` attributes with CSS custom properties for both themes. The active theme is controlled by the `[data-theme]` attribute on the root HTML element.

## Consequences

### Positive

- The unified plugin architecture is composable — adding math rendering, Mermaid diagrams, or custom directives means adding one plugin
- Shiki produces identical highlighting to VS Code, using the same TextMate grammars
- rehype-slug generates heading IDs that match the slugs computed by `extractHeadings()` in docs.ts, so TOC anchor links work
- The pipeline runs entirely on the server; no Markdown parsing happens in the browser

### Negative

- Six packages to install and version-manage
- First render latency (~2.4s) is noticeable during development when the server restarts
- Shiki's inline styles increase HTML size compared to class-based approaches
- The `any` type annotation on the cached processor variable is needed to avoid complex unified generic type issues
