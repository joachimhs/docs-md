---
title: "Use SvelteKit 2 with Svelte 5 Runes"
type: adr
status: accepted
owner: "@docsmd"
created: "2026-03-26"
updated: "2026-03-27"
tags: [framework, architecture]
decision_date: "2026-03-26"
---

# Use SvelteKit 2 with Svelte 5 Runes

## Context

docs.md needs a web framework that supports server-side rendering, file-based routing, server-only modules (for filesystem access), and API routes — all with TypeScript.

## Decision

SvelteKit 2 with Svelte 5, using **only the runes API**. The entire codebase uses `$state`, `$derived`, `$props`, and `$effect`. No legacy patterns (`export let`, `$:`, `writable`/`readable` stores) appear anywhere.

State management uses runes-based singleton classes (e.g., `DocsState` in `src/lib/stores/docs.svelte.ts`) exported as module-level instances. This replaces the legacy Svelte store pattern while being simpler than context-based approaches.

The server adapter is `@sveltejs/adapter-node`, producing a Node.js server. The `src/lib/server/` directory convention ensures server modules (config, docs, markdown, manifest, search) are never bundled into client code.

## Consequences

### Positive

- File-based routing maps directly to URL structure: `/doc/[...path]`, `/search`, `/api/*`
- `+page.server.ts` load functions cleanly separate server-side data fetching from client rendering
- The `$lib/server/` convention prevents accidental client-side imports of Node.js filesystem code
- Svelte 5 runes provide explicit, traceable reactivity — `$derived` makes computed state obvious
- Small bundle size (Svelte compiles away, no framework runtime shipped to client)

### Negative

- `$env/dynamic/private` requires aliasing in vitest (`tests/mocks/env.ts` re-exports `process.env`)
- Svelte 5 runes class syntax for stores is less documented than alternatives
- `{@render children()}` replaces `<slot />` — easy to forget when reading Svelte 4 examples
