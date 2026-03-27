---
title: "Getting Started"
type: guide
status: active
created: "2026-03-27"
updated: "2026-03-27"
tags: [setup, development]
---

# Getting Started

## Prerequisites

- Node.js 20+
- npm
- Git (for commit/push/history features)

## Install and Run

```bash
cd docsmd
npm install
DOCSMD_DOCS_DIR=docs npm run dev
```

The dev server starts at `http://localhost:5176` (configured in `vite.config.ts`).

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DOCSMD_REPO_ROOT` | `process.cwd()` | Root directory. |
| `DOCSMD_DOCS_DIR` | `docs` | Docs directory name relative to repo root. |

## Browsing Documents

The landing page shows document type cards and recently updated documents. The sidebar groups all documents by type. Click any document to view it rendered with syntax highlighting, metadata badges, and a table of contents.

Use `Ctrl+K` / `Cmd+K` to focus the search bar. Field-specific queries narrow results:

| Syntax | Effect |
|--------|--------|
| `type:adr` | Only ADR documents |
| `tag:security` | Documents tagged "security" |
| `status:draft` | Only drafts |
| `type:adr PostgreSQL` | ADRs mentioning PostgreSQL |

## Editing Documents

Click **Edit** on any document to open the dual-mode editor at `/edit/{path}`.

### Editor Modes

**Rich Text** (default) — WYSIWYG editing powered by Milkdown. Supports bold, italic, headings, lists, code blocks, tables, and task lists. Type `/` in an empty line for slash commands.

**Markdown** — Raw source editing with CodeMirror. Syntax highlighting, line numbers, bracket matching. An optional live preview pane shows the rendered output alongside the source.

Switch between modes using the segmented toggle in the toolbar. Content is preserved across mode switches.

### Keyboard Shortcuts (Markdown mode)

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` / `Cmd+B` | Bold |
| `Ctrl+I` / `Cmd+I` | Italic |
| `Ctrl+K` / `Cmd+K` | Insert link |
| `Ctrl+S` / `Cmd+S` | Save |

### Images

Paste or drag-and-drop an image into either editor. The image is uploaded to `docs/_assets/` and a Markdown reference is inserted automatically.

### Save, Commit, Push

The editor toolbar has three action buttons:

1. **Save** — Writes the file to disk. Enabled when there are unsaved changes.
2. **Commit** — Opens a commit message prompt (pre-filled with `docs({type}): update — {title}`). Stages the document and manifest, creates a git commit.
3. **Push** — Pushes committed changes to the remote. Enabled when commits are ahead.

The status bar at the bottom shows word count, dirty state, and last saved time.

### Frontmatter Form

The structured form above the editor handles all frontmatter fields:
- **Title** — Required text field
- **Type** — Dropdown populated from config types
- **Status** — Dropdown filtered to the selected type's valid statuses
- **Owner** — Text input (convention: `@username`)
- **Tags** — Type and press Enter to add, click X to remove

Created and updated dates are managed automatically.

## Creating New Documents

Click **+ New** in the header to start the creation workflow:

1. Select a document type from the card grid
2. Fill in the frontmatter form (title auto-focuses)
3. Write the body content
4. Click **Create Document**

The file is saved as `{type}/{type}-{NNN}-{slug}.md` with sequential numbering. You're redirected to the editor on success.

## Git History and Diffs

Click **History** on any document to see its commit timeline at `/history/{path}`. Each entry shows the commit hash, author, relative time, and message.

Click **View diff** on any commit to see the changes at `/diff/{path}?from={hash}`. Toggle between unified and side-by-side diff views.

## Git Status Indicators

The header shows:
- **Branch name** (e.g., `main`)
- **Modified count** — orange badge showing uncommitted changes in docs/
- **Ahead/behind** — `↑2` means 2 commits ahead of remote

The sidebar shows orange dots next to documents that have been modified but not committed.

## Running Tests

```bash
npm test              # 72 vitest tests
npm run check         # svelte-kit sync + svelte-check
```

Tests cover all 6 server modules: config, docs (read + CRUD), git, markdown, manifest, search.
