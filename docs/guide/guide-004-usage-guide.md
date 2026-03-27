---
title: "Usage Guide"
type: guide
status: active
created: "2026-03-27"
updated: "2026-03-27"
tags: [usage, guide, comprehensive]
owner: "@docsmd"
---

# Usage Guide

This is the comprehensive reference for using docs.md — from initial setup to daily document authoring, editing, searching, and Git workflows.

## Installation

### Global install (recommended for end users)

```bash
npm i -g docsmd
```

Requires Node.js 20 or later.

### From source (for development)

```bash
git clone <repo-url>
cd docsmd
npm install
npm run build    # builds web app + CLI
```

---

## Setting Up a Project

### Initialize documentation

Navigate to any Git repository and run:

```bash
docsmd init "My Project"
```

This creates the following structure:

```
docs/
  .docsmd.yml           Configuration (project name, description)
  overview.md           Welcome page
  adr/                  Architectural Decision Records
  spec/                 Technical Specifications
  guide/                How-to Guides
  runbook/              Operational Runbooks
  api/                  API Documentation
  rfc/                  Requests for Comments
  meeting/              Meeting Notes
  _templates/           Pre-filled templates for each type
  _assets/              Uploaded images
```

**Important:** The command requires a Git repository (`.git` must exist). Run `git init` first if needed.

If `docs/.docsmd.yml` already exists, it won't be overwritten — safe to re-run.

### Generate AI agent instructions

```bash
docsmd init "My Project" --ai
```

Creates `DOCSMD.md` at the repository root with structured instructions for AI coding agents. The file includes:

- Document type table with folders and default statuses
- Frontmatter field reference
- Reading rules (check status, assess recency, find related docs via tags)
- Writing rules (filename patterns, immutable fields, template usage)
- API endpoint reference

Copy relevant sections into your `CLAUDE.md` or `AGENTS.md` for agent integration.

### Configuration

Edit `docs/.docsmd.yml` to customize:

```yaml
spec_version: "0.1.0"

project:
  name: "My Project"
  description: "Internal platform documentation"

ui:
  theme: "auto"              # "light", "dark", or "auto"
  default_editor: "richtext" # "richtext" or "markdown"

search:
  result_limit: 50
  snippet_length: 200
```

Custom document types can be added under the `types` key. See the [Configuration Reference](guide/guide-002-configuration).

---

## Browsing the Web UI

### Start the server

```bash
docsmd browse
```

Opens `http://localhost:5176` in your browser.

| Flag | Default | Purpose |
|------|---------|---------|
| `-p, --port <n>` | 5176 | Port number |
| `--host <addr>` | localhost | Bind address (use `0.0.0.0` for network access) |
| `--no-open` | — | Don't auto-open browser |

For development without building:

```bash
DOCSMD_DOCS_DIR=docs npm run dev
```

### Landing page

The home page shows:
- Project name and description
- Document count summary
- Quick search input
- Type cards with document counts (click to filter)
- Recently updated documents
- Full type reference with descriptions and valid statuses
- Expandable agent instructions section (for copying into CLAUDE.md/AGENTS.md)

### Sidebar navigation

Documents are grouped by type in collapsible sections. Each section shows the type label and document count. Click a type header to expand/collapse. The active document is highlighted.

Orange dots appear next to documents that have been modified but not yet committed.

### Header

The header displays:
- Project name (links to home)
- Search bar (also accessible via `Ctrl+K` / `Cmd+K`)
- Git status: branch name, modified count badge, ahead/behind indicators (`↑2` / `↓1`)
- Theme toggle (cycles light → dark → auto)
- "+ New" button (links to new document workflow)

### Document viewer

Each document page shows:
- **Breadcrumbs**: Home / Type / Title
- **Metadata header**: Title, type badge (colored), status badge, owner, created/updated dates, tags as clickable pills
- **Toolbar**: Edit button, History button, Raw/Rendered toggle
- **Body**: Rendered Markdown with syntax-highlighted code blocks, linked headings, GFM tables, task lists
- **Table of contents**: Right sidebar on wide screens (>1200px), tracks scroll position and highlights the active heading

### Themes

Three modes: light, dark, auto (follows system preference). Persisted in localStorage. Code blocks use paired Shiki themes — `github-light` and `github-dark` — that switch automatically with the page theme.

---

## Creating Documents

### From the web UI

1. Click **+ New** in the header
2. Select a document type from the card grid
3. Fill in the frontmatter form:
   - **Title** (required, auto-focused)
   - **Type** (pre-selected from step 2)
   - **Status** (dropdown filtered to the selected type's valid statuses)
   - **Owner** (convention: `@username`)
   - **Tags** (type and press Enter or comma to add; click X to remove)
4. Write the body content in the textarea
5. Preview the generated filename: `{type}/{type}-{NNN}-{slug}.md`
6. Click **Create Document**

You're redirected to the editor on success. If a template exists for the selected type (in `docs/_templates/`), frontmatter and body are pre-filled.

### From the filesystem

Create a Markdown file in the appropriate subfolder:

```bash
docs/adr/adr-004-use-redis-for-caching.md
```

Add YAML frontmatter:

```yaml
---
title: "Use Redis for Caching"
type: adr
status: proposed
owner: "@alice"
created: "2026-03-27"
tags: [infrastructure, caching, performance]
decision_date: ""
participants: []
---
```

Write the body below the frontmatter closing `---`. The document appears in the sidebar after a server restart or manifest refresh.

### File naming convention

```
{type}-{NNN}-{slug}.md
```

- **type**: document type (adr, spec, guide, etc.)
- **NNN**: three-digit sequential number (001, 002, ...)
- **slug**: lowercase, hyphenated, max 60 characters

The sequential number is auto-generated when creating via the UI or API. When creating manually, check the existing highest number in the folder and increment.

### Using templates

Templates are in `docs/_templates/` (copied there by `docsmd init`). Each template provides:

- Complete frontmatter with all relevant fields (empty or defaulted)
- Section headings appropriate for the document type
- Italicized guidance text explaining what to write in each section

#### ADR template sections
- **Context** — Problem, constraints, background
- **Decision** — Clear statement ("We will...")
- **Consequences** — Positive and negative subsections
- **Alternatives Considered** — Each with pros, cons, rejection reason

#### Spec template sections
- **Overview** — Summary, problem solved, audience
- **Requirements** — Functional (MUST/SHOULD/MAY) and Non-Functional
- **Architecture** — Design, components, interactions
- **Implementation** — Approach, algorithms, technical decisions
- **Testing** — Unit, integration, acceptance strategies

#### Guide template sections
- **Prerequisites** — Tools, permissions, knowledge
- **Steps** — Numbered instructions
- **Troubleshooting** — Common issues in Q&A format

#### Runbook template sections
- **Overview** — Service/operation covered
- **Prerequisites** — Access, tools, environment
- **Procedure** — Explicit step-by-step (designed for high-pressure use)
- **Rollback** — How to undo
- **Verification** — Commands, expected outputs, health checks

#### API template sections
- **Overview** — Purpose, base URL, versioning
- **Authentication** — Methods, token formats
- **Endpoints** — Request/response tables per endpoint
- **Error Handling** — Error format, codes

#### RFC template sections
- **Summary** — One-paragraph overview
- **Motivation** — Problem, use cases, pain points
- **Detailed Design** — API, data models, algorithms
- **Alternatives** — Why this approach over others
- **Open Questions** — Checkboxes for unresolved items

#### Meeting template sections
- **Attendees** — Participant list
- **Agenda** — Numbered topics
- **Discussion** — Summaries with context
- **Decisions** — Specific, attributable decisions
- **Action Items** — Table: Action / Owner / Due Date

---

## Editing Documents

### Opening the editor

Click **Edit** on any document viewer page, or navigate directly to `/edit/{path}` (without the `.md` extension).

### Editor modes

**Rich Text** (WYSIWYG) — Powered by Milkdown/Crepe. Produces clean Markdown output (not HTML). Supports:
- Inline formatting (bold, italic, strikethrough, inline code)
- Headings, paragraphs, blockquotes, horizontal rules
- Bullet lists, ordered lists, task lists
- Code blocks with language selection
- Tables
- Images (inline and block)
- Slash commands — type `/` in an empty line for a command palette
- Floating toolbar on text selection

**Markdown** (source) — Powered by CodeMirror 6. Features:
- Syntax highlighting for Markdown
- Line numbers, line wrapping, bracket matching
- Optional live preview pane (toggle in toolbar)
- Keyboard shortcuts (see below)

Switch between modes using the segmented toggle in the toolbar. Content is preserved across switches — both editors read from and write to the same Markdown string.

The default mode is configurable via `ui.default_editor` in `.docsmd.yml`.

### Keyboard shortcuts (Markdown mode)

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` / `Cmd+B` | Bold (wraps selection in `**`) |
| `Ctrl+I` / `Cmd+I` | Italic (wraps selection in `*`) |
| `Ctrl+K` / `Cmd+K` | Insert link (`[text](url)`) |
| `Ctrl+S` / `Cmd+S` | Save document |

### Images

Paste or drag-and-drop an image into either editor. The image is:
1. Uploaded to `docs/_assets/` via `POST /api/assets`
2. Named with a timestamp prefix for uniqueness
3. A Markdown reference is inserted at the cursor: `![filename](_assets/timestamp-filename.png)`

### Frontmatter form

The structured form above the editor handles metadata without exposing raw YAML:

| Field | Behavior |
|-------|----------|
| **Title** | Required text input. Auto-focuses on new documents. |
| **Type** | Dropdown from config types. Changing type resets status to the new type's default. |
| **Status** | Dropdown filtered to the selected type's valid statuses. |
| **Owner** | Text input. Convention: `@username`. |
| **Tags** | Enter/comma to add, X to remove, Backspace to delete last. Displayed as colored pills. |
| **Created** | Read-only, formatted date. Set once on creation. |
| **Updated** | Read-only, formatted date. Auto-set on save. |

### Status bar

The bottom bar shows:
- Word count (excludes code blocks)
- Dirty state indicator: orange "Unsaved changes" or green "Saved"
- Last saved timestamp

---

## Save, Commit, Push

The editor toolbar has three action buttons that form a progressive workflow:

### Save

Writes the current frontmatter and body to disk. The `updated` date is set automatically. The button is enabled when there are unsaved changes (dirty state).

### Commit

Opens a prompt for a commit message. The default message follows the convention:

```
docs({type}): update — {title}
```

For example: `docs(adr): update — Use PostgreSQL as Primary Database`

Only the document file is staged and committed (the manifest is in-memory, not committed). The button shows after saving.

### Push

Pushes all committed changes to the remote. Fast-forward only — never force-pushes. The button shows the number of commits ahead of the remote (e.g., "Push ↑2"). Disabled when there's nothing to push.

After each action, the Git status indicators in the header and sidebar refresh automatically.

---

## Searching

### Web UI search

The search bar in the header (or `Ctrl+K` / `Cmd+K`) searches across all documents. As you type, a dropdown shows the top 5 results. Press Enter for the full search page.

The search page at `/search` has:
- Large search input (auto-focused)
- Facet panel (left): filter by type, status, and tags with checkbox counts
- Results list (right): title, badges, highlighted snippet, tags, updated date
- URL reflects search state (`/search?q=auth&type=adr`) — bookmarkable

### Field-specific queries

Narrow results with prefixes in the search bar:

| Prefix | Example | Effect |
|--------|---------|--------|
| `type:` | `type:adr` | Only ADR documents |
| `tag:` | `tag:security` | Documents tagged "security" |
| `status:` | `status:draft` | Only drafts |
| `owner:` | `owner:alice` | Documents owned by alice |

Combine prefixes with free text: `type:spec PostgreSQL` finds specs mentioning PostgreSQL.

Multiple prefixes work: `type:adr status:proposed` finds proposed ADRs.

### CLI search

```bash
docsmd search "authentication"
docsmd search "deployment" --type guide
docsmd search "postgresql" --status accepted --limit 5
docsmd search "auth" --plain    # tab-separated for scripting
```

Plain output format (one line per result):
```
adr-001-use-postgresql	Use PostgreSQL	adr	accepted	adr/adr-001-use-postgresql.md
```

The CLI builds its own FlexSearch index with three fields: title (highest weight), tags, and body (Markdown stripped). Results include a snippet showing the query match in context.

---

## Git Integration

### Status indicators

The header shows real-time Git status:
- **Branch name** — current branch (e.g., `main`)
- **Modified count** — orange badge with the number of uncommitted changes in docs/
- **Ahead** — `↑N` commits ahead of remote
- **Behind** — `↓N` commits behind remote

The sidebar shows orange dots next to modified documents.

All indicators refresh after save, commit, and push operations.

### History

Click **History** on any document to see its commit timeline at `/history/{path}`.

Each commit entry shows:
- Short hash (7 characters)
- Author name
- Relative time ("3 days ago", "2 hours ago")
- Commit message
- "View diff" link

### Diffs

Click **View diff** on a history entry to see the changes at `/diff/{path}?from={hash}`.

Two viewing modes:
- **Side by Side** — old and new content in parallel columns
- **Unified** — interleaved deletions (red) and additions (green)

Toggle between modes with the buttons at the top.

### Live file watching

The server watches `docs/**/*.md` for external changes using chokidar. When files are added, modified, or deleted outside the web UI (by a text editor, AI agent, git pull, etc.), the manifest and search index are automatically invalidated. The next page load or search query picks up the new state — no server restart needed.

The watcher uses a 300ms stability threshold (waits for writes to finish) and a 500ms debounce (batches rapid changes into one reindex).

### Non-Git environments

If the project directory is not a Git repository:
- Git indicators in the header are hidden
- Commit and Push buttons are disabled
- History and Diff pages show an error message
- Save still works (writes to disk without Git)

---

## Document Types Reference

### ADR — Architectural Decision Records

Record decisions about technologies, patterns, or approaches. Use when the team needs to document why a choice was made and what alternatives were considered.

| Status | Meaning |
|--------|---------|
| proposed | Under consideration |
| accepted | Decision adopted |
| rejected | Decision declined |
| deprecated | No longer recommended |
| superseded | Replaced by another ADR |

Extra frontmatter: `decision_date`, `participants`, `supersedes`, `superseded_by`

### Spec — Technical Specifications

Detail how a system or feature works. Use for designs that need review before implementation.

| Status | Meaning |
|--------|---------|
| draft | Being written |
| review | Open for feedback |
| approved | Ready for implementation |
| implemented | Built and deployed |
| deprecated | No longer current |

Extra frontmatter: `version`

### Guide — How-to Guides

Step-by-step instructions. Use for onboarding, setup, workflows, and task-oriented content.

| Status | Meaning |
|--------|---------|
| draft | Being written |
| active | Current and maintained |
| outdated | Needs update |
| archived | No longer relevant |

Extra frontmatter: `audience`

### Runbook — Operational Runbooks

Procedures for incidents, deployments, and maintenance. Designed to be followed under pressure.

| Status | Meaning |
|--------|---------|
| draft | Being written |
| active | Current, tested |
| outdated | Needs review |

### API — API Documentation

Endpoints, request/response formats, authentication, and error handling.

| Status | Meaning |
|--------|---------|
| draft | Being written |
| active | Current API |
| deprecated | Being phased out |

Extra frontmatter: `version`

### RFC — Requests for Comments

Proposals for team discussion. Use when a change needs broader input before committing.

| Status | Meaning |
|--------|---------|
| draft | Being written |
| discussion | Open for feedback |
| accepted | Approved for implementation |
| rejected | Declined |
| withdrawn | Retracted by author |

### Meeting — Meeting Notes

Capture decisions, action items, and discussion context.

| Status | Meaning |
|--------|---------|
| draft | Notes being compiled |
| final | Complete record |

### Document (generic)

General documents that don't fit a specific type. Files placed directly in `docs/` (not in a subfolder) get this type automatically.

| Status | Meaning |
|--------|---------|
| draft | Being written |
| active | Current |
| archived | No longer relevant |

---

## Frontmatter Reference

### Required fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Document title. Documents without this field are ignored by the scanner. |

### Standard fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Document type. Inferred from parent folder if omitted. |
| `status` | string | Lifecycle status. Defaults to the type's `default_status`. |
| `owner` | string | Author or maintainer. Convention: `@username`. |
| `created` | string | Creation date. ISO 8601 format: `"2026-03-27"`. Set once, never change. |
| `updated` | string | Last modification date. Auto-set when saving via the editor. |
| `tags` | string[] | Array of tags: `[infrastructure, security]`. Used for search and filtering. |
| `id` | string | Unique identifier. Auto-generated from filename if omitted. Do not change after creation. |
| `summary` | string | Short description. Auto-extracted from first paragraph if omitted (max 200 chars). |

### Extended fields

| Field | Type | Used by |
|-------|------|---------|
| `priority` | string | Any type |
| `assignee` | string or string[] | Any type |
| `due_date` | string | Any type |
| `version` | string | Spec, API |
| `audience` | string[] | Guide |
| `decision_date` | string | ADR |
| `participants` | string[] | ADR, Meeting |
| `supersedes` | string | ADR |
| `superseded_by` | string | ADR |
| `related` | string[] | Any type |

Any additional frontmatter keys are preserved. Custom keys appear in the document viewer but don't have dedicated form fields in the editor (they're stored as-is).

### Rules

- Always quote date strings in YAML: `created: "2026-03-27"` (unquoted dates can be parsed as Date objects)
- Never change `id` or `created` after initial creation
- Never rename files (breaks Git history)
- Always update the `updated` field when modifying a document
- Use sequential numbering in filenames: `{type}-{NNN}-{slug}.md`
- Place documents in the correct subfolder for their type

---

## API Reference

For programmatic access, see the full [API Reference](spec/spec-002-api-reference). Key endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/docs` | List all documents (filterable) |
| `POST` | `/api/docs` | Create new document |
| `GET` | `/api/docs/{id}` | Read document (supports `?at={hash}`) |
| `PUT` | `/api/docs/{id}` | Update document |
| `DELETE` | `/api/docs/{id}` | Archive document |
| `GET` | `/api/search?q=...` | Full-text search |
| `POST` | `/api/preview` | Render Markdown to HTML |
| `POST` | `/api/assets` | Upload image |
| `GET` | `/api/git/status` | Git status |
| `GET` | `/api/git/history?path=...` | File commit history |
| `GET` | `/api/git/diff?path=...&from=...` | File diff |
| `POST` | `/api/git/commit` | Commit changes |
| `POST` | `/api/git/push` | Push to remote |

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `docsmd browse` | Start web UI (default port 5176) |
| `docsmd init [name]` | Scaffold docs/ in current git repo |
| `docsmd init --ai` | Also generate DOCSMD.md agent instructions |
| `docsmd manifest` | Print document count and type breakdown |
| `docsmd search <query>` | Search from terminal |

See the full [CLI Reference](guide/guide-003-cli-reference) for all flags and options.
