---
title: "Use SvelteKit with Svelte 5 Runes"
type: adr
status: accepted
owner: "@docsmd"
created: "2026-03-26"
updated: "2026-03-27"
tags: [framework, frontend, architecture]
decision_date: "2026-03-26"
---

# Use SvelteKit with Svelte 5 Runes

## Context

docs.md needs a web framework for building a documentation browser with server-side rendering, filesystem access, and API routes. The framework must support:

- Server-side rendering (SSR) for fast initial page loads
- API routes for search and document CRUD
- File-system-based routing
- TypeScript support
- Good developer experience for a documentation UI

## Decision

We chose SvelteKit 2 with Svelte 5 and the runes API exclusively.

**No legacy Svelte patterns are used.** All state management uses `$state`, `$derived`, `$props`, and `$effect`. No `export let`, no `$:` reactive statements, no Svelte stores (`writable`, `readable`).

## Consequences

### Positive

- Svelte 5 runes provide explicit, predictable reactivity with fine-grained updates
- SvelteKit's adapter-node gives us a production-ready Node.js server
- File-based routing maps cleanly to our URL structure (`/doc/[...path]`, `/search`, `/api/*`)
- Server-only modules (`src/lib/server/`) are never bundled into client code
- Small bundle size — Svelte compiles to vanilla JS without a runtime

### Negative

- Svelte 5 runes are newer and have less ecosystem coverage for third-party components
- The `$state` class pattern for stores is less documented than legacy Svelte stores
- SvelteKit's `$env` module requires special handling in vitest (we mock via aliases)

## Alternatives Considered

### Next.js (React)

Larger ecosystem but heavier runtime, more boilerplate for reactive state management, and React Server Components add complexity we don't need.

### Astro

Excellent for static content sites but less suited for the dynamic features we need (real-time search, theme toggling, future editing capabilities).
