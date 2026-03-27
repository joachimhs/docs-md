---
title: "Use unified/remark/rehype for Markdown Rendering"
type: adr
status: accepted
owner: "@specmd"
created: "2026-03-26"
updated: "2026-03-27"
tags: [markdown, rendering, architecture]
decision_date: "2026-03-26"
---

# Use unified/remark/rehype for Markdown Rendering

## Context

spec.md needs to render Markdown documents to HTML with support for GFM (GitHub Flavored Markdown), syntax highlighting, and extensibility for future plugins.

## Decision

We use the unified ecosystem with this pipeline:

```
remarkParse → remarkGfm → remarkRehype → rehypeShiki → rehypeSlug → rehypeStringify
```

- **remark-parse**: Parse Markdown to mdast (Markdown AST)
- **remark-gfm**: Add GFM support (tables, task lists, strikethrough, autolinks)
- **remark-rehype**: Convert mdast to hast (HTML AST)
- **rehype-shiki**: Syntax highlight code blocks with dual themes (github-light + github-dark)
- **rehype-slug**: Add `id` attributes to headings for TOC anchor links
- **rehype-stringify**: Serialize hast to HTML string

The processor is created once and cached, since Shiki theme initialization is expensive (~2.4s first run).

## Consequences

### Positive

- The unified ecosystem is the standard for Markdown processing in Node.js
- Plugin architecture makes it easy to add features (math, diagrams, custom directives)
- Shiki produces accurate syntax highlighting matching VS Code themes
- Dual-theme support means code blocks adapt to light/dark mode via CSS

### Negative

- Many small packages to manage (6 in the pipeline)
- First render is slow due to Shiki initialization (mitigated by caching)
- rehype-shiki generates inline styles rather than CSS classes (larger HTML output)

## Alternatives Considered

### marked

Simpler single-package solution but less extensible. No AST-level transformations.

### markdown-it

Good plugin ecosystem but doesn't integrate as cleanly with rehype for post-processing.
