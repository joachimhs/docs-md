# Phase 2 — Editing & Git Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the complete write path — creating and editing documents through a dual-mode editor (WYSIWYG + Markdown), document CRUD, image uploads, Git integration (history, diffs, commit, push), and Git status indicators in the UI.

**Architecture:** Server module `git.ts` wraps `simple-git` for all Git operations scoped to docs/. Document write operations (create, update, archive) extend `docs.ts`. The editor uses Milkdown (WYSIWYG) and CodeMirror (Markdown source) sharing a single Markdown string. A Git state store drives status indicators in the header and sidebar.

**Tech Stack:** simple-git, @milkdown/crepe (WYSIWYG), codemirror (source editor), diff2html (diff rendering), gray-matter (frontmatter serialization)

**Spec document:** `PHASE-2-EDITING-AND-GIT.md` in project root.

**Existing codebase:** `/Users/joachimhaagenskeie/Projects/claude/specMD/specmd` — Phase 1 complete with 42 passing tests, 0 type errors. Server modules in `src/lib/server/`, 9 components in `src/lib/components/`, Svelte 5 runes throughout.

---

## File Structure

### New files

```
src/lib/server/
  git.ts                                  # Git operations (simple-git wrapper)

src/lib/stores/
  git.svelte.ts                           # GitState runes class

src/lib/components/
  FrontmatterForm.svelte                  # Structured frontmatter editor
  MilkdownEditor.svelte                   # WYSIWYG Markdown editor
  CodeMirrorEditor.svelte                 # Raw Markdown source editor
  MarkdownPreview.svelte                  # Live preview for Markdown mode
  DocEditor.svelte                        # Orchestrator: dual-mode editor
  EditorToolbar.svelte                    # Mode toggle + save/commit/push buttons
  EditorStatusBar.svelte                  # Word count, dirty state, last saved

src/routes/
  edit/[...path]/
    +page.server.ts                       # Load document + config + git status
    +page.svelte                          # Edit page shell
  new/
    +page.server.ts                       # Load templates + config
    +page.svelte                          # New document workflow
  history/[...path]/
    +page.svelte                          # Git history timeline
  diff/[...path]/
    +page.svelte                          # Side-by-side/unified diff viewer
  api/
    git/status/+server.ts                 # GET git status
    git/history/+server.ts                # GET file history
    git/diff/+server.ts                   # GET file diff
    git/commit/+server.ts                 # POST commit changes
    git/push/+server.ts                   # POST push changes
    docs/[id]/+server.ts                  # GET/PUT/DELETE single document
    assets/+server.ts                     # POST upload image
    assets/[...filename]/+server.ts       # GET serve image
    preview/+server.ts                    # POST render markdown to HTML

tests/lib/server/
  git.test.ts                             # Git module tests
  docs-crud.test.ts                       # CRUD operation tests
```

### Modified files

```
src/lib/server/docs.ts                    # Add createDocument, updateDocument, archiveDocument, slugify, getNextSequence
src/routes/api/docs/+server.ts            # Add POST handler
src/routes/+layout.svelte                 # Add git status indicators in header
src/lib/components/Sidebar.svelte         # Add modified dots
src/routes/doc/[...path]/+page.svelte     # Enable Edit button (link to /edit/)
package.json                              # New dependencies
```

---

## Task 1: Install Phase 2 Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Git and editor dependencies**

```bash
cd /Users/joachimhaagenskeie/Projects/claude/specMD/specmd

# Git operations
npm install simple-git

# WYSIWYG editor — use Crepe (Milkdown's batteries-included package)
npm install @milkdown/kit @milkdown/crepe

# Markdown source editor
npm install codemirror @codemirror/lang-markdown @codemirror/language
npm install @codemirror/state @codemirror/view @codemirror/commands
npm install @codemirror/search @codemirror/autocomplete

# Diff rendering
npm install diff2html
```

Note: Use `@milkdown/crepe` which bundles core + commonmark + gfm + history + clipboard + listener + slash + tooltip + prism. This avoids installing 10+ separate @milkdown packages. If Crepe doesn't exist or is too opinionated, fall back to individual packages as listed in the spec.

- [ ] **Step 2: Verify install and dev server**

```bash
npm run dev -- --port 5176
```
Expected: starts without errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Phase 2 dependencies (simple-git, milkdown, codemirror, diff2html)"
```

---

## Task 2: Server Module — git.ts

**Files:**
- Create: `src/lib/server/git.ts`
- Create: `tests/lib/server/git.test.ts`

- [ ] **Step 1: Write tests**

The git tests need a real git repo. Use the project's own git repo (the specmd directory IS a git repo). Test against test-docs/ files which are committed.

```typescript
// tests/lib/server/git.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

describe('git', () => {
  describe('isGitRepo', () => {
    it('should return true for a git repository', async () => {
      const { isGitRepo } = await import('$lib/server/git');
      expect(await isGitRepo()).toBe(true);
    });
  });

  describe('getDocsStatus', () => {
    it('should return status object with branch name', async () => {
      const { getDocsStatus } = await import('$lib/server/git');
      const status = await getDocsStatus();
      expect(status.branch).toBeDefined();
      expect(typeof status.isClean).toBe('boolean');
      expect(Array.isArray(status.modified)).toBe(true);
      expect(Array.isArray(status.added)).toBe(true);
      expect(typeof status.ahead).toBe('number');
      expect(typeof status.behind).toBe('number');
    });
  });

  describe('getFileHistory', () => {
    it('should return commit history for a committed file', async () => {
      const { getFileHistory } = await import('$lib/server/git');
      // test-docs/overview.md should have at least 1 commit
      const history = await getFileHistory('overview.md', 5);
      expect(Array.isArray(history)).toBe(true);
      if (history.length > 0) {
        expect(history[0]).toHaveProperty('hash');
        expect(history[0]).toHaveProperty('short_hash');
        expect(history[0]).toHaveProperty('author');
        expect(history[0]).toHaveProperty('date');
        expect(history[0]).toHaveProperty('message');
      }
    });
  });

  describe('getFileDiff', () => {
    it('should return diff string for a commit', async () => {
      const { getFileHistory, getFileDiff } = await import('$lib/server/git');
      const history = await getFileHistory('overview.md', 1);
      if (history.length > 0) {
        const diff = await getFileDiff('overview.md', history[0].hash);
        expect(typeof diff).toBe('string');
      }
    });
  });

  describe('getFileAtCommit', () => {
    it('should return file content at a specific commit', async () => {
      const { getFileHistory, getFileAtCommit } = await import('$lib/server/git');
      const history = await getFileHistory('overview.md', 1);
      if (history.length > 0) {
        const content = await getFileAtCommit('overview.md', history[0].hash);
        expect(typeof content).toBe('string');
        expect(content.length).toBeGreaterThan(0);
      }
    });
  });
});
```

- [ ] **Step 2: Run tests — should fail**

- [ ] **Step 3: Implement git.ts**

Create `src/lib/server/git.ts` with all functions from the spec (Part A, lines 57-196):
- `getGit()` — returns `simpleGit(REPO_ROOT)`
- `isGitRepo()` — try git.status(), return true/false
- `getDocsStatus()` — status scoped to docs/ files
- `getFileHistory(docPath, limit)` — git log for a specific file
- `getFileDiff(docPath, fromHash, toHash?)` — unified diff
- `getFileAtCommit(docPath, hash)` — git show
- `commitDocChange(docPath, message, author?)` — stage doc + manifest, commit
- `pushChanges()` — fast-forward push only

- [ ] **Step 4: Run tests — should pass**
- [ ] **Step 5: Commit**

```bash
git add src/lib/server/git.ts tests/lib/server/git.test.ts
git commit -m "feat: add Git integration module with simple-git"
```

---

## Task 3: Document CRUD Operations

**Files:**
- Modify: `src/lib/server/docs.ts`
- Create: `tests/lib/server/docs-crud.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// tests/lib/server/docs-crud.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

describe('document CRUD', () => {
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    // Clean up created files
    const { DOCS_ROOT } = await import('$lib/server/config');
    for (const p of cleanupPaths) {
      const full = resolve(DOCS_ROOT, p);
      if (existsSync(full)) unlinkSync(full);
    }
    cleanupPaths.length = 0;
    // Clean up _archive if created
    const archivePath = resolve(DOCS_ROOT, '_archive');
    if (existsSync(archivePath)) rmSync(archivePath, { recursive: true });
  });

  describe('slugify', () => {
    it('should convert title to URL-safe slug', async () => {
      const { slugify } = await import('$lib/server/docs');
      expect(slugify('Use PostgreSQL as Primary DB')).toBe('use-postgresql-as-primary-db');
    });

    it('should handle special characters', async () => {
      const { slugify } = await import('$lib/server/docs');
      expect(slugify('What? Why! How.')).toBe('what-why-how');
    });

    it('should truncate to 60 chars', async () => {
      const { slugify } = await import('$lib/server/docs');
      const long = 'a'.repeat(100);
      expect(slugify(long).length).toBeLessThanOrEqual(60);
    });
  });

  describe('getNextSequence', () => {
    it('should return next number for existing type', async () => {
      const { getNextSequence } = await import('$lib/server/docs');
      const next = getNextSequence('adr');
      expect(next).toBeGreaterThanOrEqual(1);
      expect(typeof next).toBe('number');
    });

    it('should return 1 for type with no existing docs', async () => {
      const { getNextSequence } = await import('$lib/server/docs');
      const next = getNextSequence('nonexistent-type');
      expect(next).toBe(1);
    });
  });

  describe('createDocument', () => {
    it('should create a new document file', async () => {
      const { createDocument } = await import('$lib/server/docs');
      const { DOCS_ROOT } = await import('$lib/server/config');
      const result = createDocument(
        { title: 'Test Create Doc', type: 'guide', status: 'draft' },
        '# Test\n\nThis is a test document.'
      );
      cleanupPaths.push(result.path);
      expect(result.id).toBeDefined();
      expect(result.path).toContain('guide/');
      expect(result.path).toContain('.md');
      expect(existsSync(resolve(DOCS_ROOT, result.path))).toBe(true);
    });

    it('should throw if title is missing', async () => {
      const { createDocument } = await import('$lib/server/docs');
      expect(() => createDocument({ type: 'guide' }, 'body')).toThrow();
    });
  });

  describe('updateDocument', () => {
    it('should update frontmatter and body', async () => {
      const { createDocument, updateDocument } = await import('$lib/server/docs');
      const { readDocument } = await import('$lib/server/docs');
      const created = createDocument(
        { title: 'Update Test', type: 'guide', status: 'draft' },
        '# Original'
      );
      cleanupPaths.push(created.path);

      const updated = updateDocument(created.path, {
        frontmatter: { status: 'active' },
        body: '# Updated content'
      });
      expect(updated.updated).toBeDefined();

      const doc = await readDocument(created.path);
      expect(doc.frontmatter.status).toBe('active');
      expect(doc.body).toContain('# Updated content');
      expect(doc.frontmatter.title).toBe('Update Test'); // preserved
    });
  });

  describe('archiveDocument', () => {
    it('should move document to _archive/', async () => {
      const { createDocument, archiveDocument } = await import('$lib/server/docs');
      const { DOCS_ROOT } = await import('$lib/server/config');
      const created = createDocument(
        { title: 'Archive Test', type: 'guide', status: 'draft' },
        '# To archive'
      );

      const result = archiveDocument(created.path);
      expect(result.archived_path).toContain('_archive');
      expect(existsSync(resolve(DOCS_ROOT, created.path))).toBe(false);
      expect(existsSync(resolve(DOCS_ROOT, result.archived_path))).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests — should fail**

- [ ] **Step 3: Implement CRUD functions in docs.ts**

Add to `src/lib/server/docs.ts`:

- `slugify(text)` — lowercase, remove special chars, spaces to hyphens, max 60 chars
- `getNextSequence(type)` — scan `docs/{type}/` for `{type}-NNN-*.md`, find highest NNN, return NNN+1
- `createDocument(frontmatter, body)` — validate title, determine type folder, generate sequential filename, set dates, write with `matter.stringify(body, frontmatter)`, regenerate manifest
- `updateDocument(docPath, { frontmatter?, body? })` — read existing, merge frontmatter (shallow), replace body if given, set updated date, write, regenerate manifest
- `archiveDocument(docPath)` — ensure `_archive/` exists, move file there, regenerate manifest

Use `gray-matter`'s `matter.stringify(content, data)` to serialize frontmatter + body back to Markdown.

- [ ] **Step 4: Run tests — should pass**
- [ ] **Step 5: Commit**

```bash
git add src/lib/server/docs.ts tests/lib/server/docs-crud.test.ts
git commit -m "feat: add document CRUD operations (create, update, archive)"
```

---

## Task 4: CRUD and Git API Routes

**Files:**
- Modify: `src/routes/api/docs/+server.ts` (add POST)
- Create: `src/routes/api/docs/[id]/+server.ts` (GET, PUT, DELETE)
- Create: `src/routes/api/assets/+server.ts` (POST upload)
- Create: `src/routes/api/assets/[...filename]/+server.ts` (GET serve)
- Create: `src/routes/api/preview/+server.ts` (POST render)
- Create: `src/routes/api/git/status/+server.ts`
- Create: `src/routes/api/git/history/+server.ts`
- Create: `src/routes/api/git/diff/+server.ts`
- Create: `src/routes/api/git/commit/+server.ts`
- Create: `src/routes/api/git/push/+server.ts`

- [ ] **Step 1: Add POST to docs API**

Add `POST` handler to `src/routes/api/docs/+server.ts` — calls `createDocument()`, returns 201 with `{ id, path, filename }`. Returns 400 if title is missing.

- [ ] **Step 2: Create single-document API**

Create `src/routes/api/docs/[id]/+server.ts`:
- `GET` — find document by ID in manifest, call `readDocument()`, return `{ frontmatter, body, path }`. If `?at={hash}` query param is present, call `getFileAtCommit()` instead to return the document content at that specific commit.
- `PUT` — body `{ frontmatter?, body? }`, call `updateDocument()`, return updated info
- `DELETE` — call `archiveDocument()`, return archived path

- [ ] **Step 3: Create image upload/serve APIs**

`src/routes/api/assets/+server.ts`:
- `POST` — accept multipart form data, save file to `docs/_assets/{timestamp}-{originalname}`, return `{ path, url }`

`src/routes/api/assets/[...filename]/+server.ts`:
- `GET` — serve file from `docs/_assets/` with correct Content-Type and cache headers

- [ ] **Step 4: Create preview API**

`src/routes/api/preview/+server.ts`:
- `POST` — body `{ markdown }`, call `renderMarkdown()`, return `{ html }`

- [ ] **Step 5: Create Git API routes**

All 5 Git API routes as specified:
- `GET /api/git/status` → `getDocsStatus()`
- `GET /api/git/history?path=...&limit=...` → `getFileHistory()`
- `GET /api/git/diff?path=...&from=...&to=...` → `getFileDiff()`
- `POST /api/git/commit` — body `{ message, files?, author? }` → `commitDocChange()`
- `POST /api/git/push` → `pushChanges()`

Include proper error handling (400 for missing params, 404 for missing files, 500 for git errors).

- [ ] **Step 6: Test APIs via curl**

```bash
# Status
curl http://localhost:5176/api/git/status
# History
curl 'http://localhost:5176/api/git/history?path=overview.md'
# Create doc
curl -X POST http://localhost:5176/api/docs -H 'Content-Type: application/json' -d '{"frontmatter":{"title":"Test","type":"guide"},"body":"# Test"}'
# Preview
curl -X POST http://localhost:5176/api/preview -H 'Content-Type: application/json' -d '{"markdown":"# Hello **world**"}'
```

- [ ] **Step 7: Commit**

```bash
git add src/routes/api/
git commit -m "feat: add CRUD, Git, asset upload, and preview API routes"
```

---

## Task 5: Git State Store + UI Indicators

**Files:**
- Create: `src/lib/stores/git.svelte.ts`
- Modify: `src/routes/+layout.svelte` (header git indicators)
- Modify: `src/lib/components/Sidebar.svelte` (modified dots)

- [ ] **Step 1: Create git store**

Create `src/lib/stores/git.svelte.ts`:

```typescript
class GitState {
  branch = $state('');
  modified = $state<string[]>([]);
  added = $state<string[]>([]);
  ahead = $state(0);
  behind = $state(0);
  loading = $state(false);
  isRepo = $state(true);

  isModified(docPath: string) {
    return this.modified.some(f => f.endsWith(docPath)) ||
           this.added.some(f => f.endsWith(docPath));
  }

  get modifiedCount() {
    return this.modified.length + this.added.length;
  }

  async refresh() {
    this.loading = true;
    try {
      const res = await fetch('/api/git/status');
      const data = await res.json();
      this.branch = data.branch;
      this.modified = data.modified;
      this.added = data.added;
      this.ahead = data.ahead;
      this.behind = data.behind;
      this.isRepo = true;
    } catch {
      this.isRepo = false;
    }
    this.loading = false;
  }
}

export const gitState = new GitState();
```

- [ ] **Step 2: Add git indicators to header**

Modify `src/routes/+layout.svelte`:
- Import `gitState`
- Call `gitState.refresh()` in `$effect` on mount
- In header, after the logo: show branch name, modified count badge, ahead/behind arrows
- Only show if `gitState.isRepo` is true

- [ ] **Step 3: Add modified dots to sidebar**

Modify `src/lib/components/Sidebar.svelte`:
- Import `gitState`
- Next to each document link, show a colored dot: orange if `gitState.isModified(doc.path)`, green if in `added`

- [ ] **Step 4: Enable Edit button on document viewer**

Modify `src/routes/doc/[...path]/+page.svelte`:
- Change Edit button from `disabled` to a link: `<a href="/edit/{data.document.path.replace(/\.md$/, '')}">Edit</a>`
- Change History button to link: `<a href="/history/{data.document.path.replace(/\.md$/, '')}">History</a>`

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/git.svelte.ts src/routes/+layout.svelte src/lib/components/Sidebar.svelte src/routes/doc/
git commit -m "feat: add git status indicators in header and sidebar"
```

---

## Task 6: FrontmatterForm Component

**Files:**
- Create: `src/lib/components/FrontmatterForm.svelte`

- [ ] **Step 1: Create component**

Props: `frontmatter: DocFrontmatter`, `config: DocsMDConfig`, `onchange: (updated: Partial<DocFrontmatter>) => void`, `isNew?: boolean`

Structured form (no raw YAML exposure):
- **Title**: text input, required, auto-focuses when `isNew`
- **Type**: `<select>` populated from `config.types` (label for display, key for value)
- **Status**: `<select>`, options from `config.types[selectedType].statuses`
- **Owner**: text input with `@` placeholder
- **Tags**: tag input — text field, press Enter/comma to add tag, click X to remove. Show existing tags from `docs.allTags` as autocomplete suggestions.
- **Created**: read-only date display (formatted)
- **Updated**: read-only date display
- **Custom fields**: collapsible "Advanced" section showing any additional frontmatter keys as text inputs

All changes call `onchange()` with the updated fields.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/FrontmatterForm.svelte
git commit -m "feat: add FrontmatterForm component for structured frontmatter editing"
```

---

## Task 7: CodeMirror Markdown Editor

**Files:**
- Create: `src/lib/components/CodeMirrorEditor.svelte`

- [ ] **Step 1: Create component**

Props: `content: string`, `readonly: boolean`, `onchange: (markdown: string) => void`, `onsave?: () => void`

Setup:
- `@codemirror/lang-markdown` with GFM support
- Syntax highlighting for Markdown
- Line wrapping enabled
- Bracket matching
- Auto-indent
- Custom keybindings: Ctrl/Cmd+B (bold), Ctrl/Cmd+I (italic), Ctrl/Cmd+K (link), Ctrl/Cmd+S (save callback)
- Image paste/drop: intercept paste and drop events, upload via `POST /api/assets`, insert `![alt](_assets/file.png)`
- Listen for changes, call `onchange` with updated text
- Expose a method to set content externally (for mode switching)

Use `$effect` to create the editor on mount and destroy on unmount. The EditorView instance should be stored in a local variable.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/CodeMirrorEditor.svelte
git commit -m "feat: add CodeMirror Markdown editor component"
```

---

## Task 8: Milkdown WYSIWYG Editor

**Files:**
- Create: `src/lib/components/MilkdownEditor.svelte`

- [ ] **Step 1: Create component**

Props: `content: string`, `readonly: boolean`, `onchange: (markdown: string) => void`

Use `@milkdown/crepe` if available, otherwise individual packages. Setup:
- Initialize with Markdown string (body only, no frontmatter)
- Register listener for content changes → emit `onchange` with serialized Markdown
- GFM support (tables, task lists, strikethrough)
- History (undo/redo)
- Clipboard (copy/paste)
- Slash commands (type `/` for command palette)
- Tooltip (floating toolbar on text selection)

Expose method to replace content externally (for mode switching from CodeMirror → Milkdown).

Use `$effect` for lifecycle. Mount Milkdown to a `<div>` ref.

IMPORTANT: Milkdown is client-only. Wrap in `{#if mounted}` or use `onMount` to avoid SSR issues.

Image paste/drop handling: intercept paste and drop events, upload the image via `POST /api/assets`, then insert `![alt](_assets/filename.png)` into the editor content.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/MilkdownEditor.svelte
git commit -m "feat: add Milkdown WYSIWYG editor component"
```

---

## Task 9: Markdown Preview + Editor Toolbar + Status Bar

**Files:**
- Create: `src/lib/components/MarkdownPreview.svelte`
- Create: `src/lib/components/EditorToolbar.svelte`
- Create: `src/lib/components/EditorStatusBar.svelte`

- [ ] **Step 1: Create MarkdownPreview**

Props: `markdown: string`

Fetches `POST /api/preview` with the markdown body (debounced 200ms), renders the returned HTML in a `.prose` container. Shows a loading indicator while fetching.

- [ ] **Step 2: Create EditorToolbar**

Props: `mode`, `showPreview`, `isDirty`, `gitAhead`, `onModeChange`, `onPreviewToggle`, `onSave`, `onCommit`, `onPush`, `docPath`

Left side: segmented mode toggle [Rich Text] [Markdown], preview toggle (markdown mode only)
Right side: Save button (enabled when dirty), Commit button (opens commit modal), Push button (enabled when ahead > 0), History link

- [ ] **Step 3: Create EditorStatusBar**

Props: `body: string`, `isDirty: boolean`, `lastSaved: string`

Shows: word count, character count, dirty indicator, "Last saved: {time}" or "Unsaved changes"

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/MarkdownPreview.svelte src/lib/components/EditorToolbar.svelte src/lib/components/EditorStatusBar.svelte
git commit -m "feat: add MarkdownPreview, EditorToolbar, and EditorStatusBar components"
```

---

## Task 10: DocEditor Orchestrator

**Files:**
- Create: `src/lib/components/DocEditor.svelte`

- [ ] **Step 1: Create component**

Props: `initialFrontmatter: DocFrontmatter`, `initialBody: string`, `docPath: string`, `config: DocsMDConfig`, `gitStatus: any`

State:
```typescript
let mode = $state<'richtext' | 'markdown'>('richtext');
let body = $state(initialBody);
let frontmatter = $state<DocFrontmatter>(initialFrontmatter);
let lastSaved = $state(initialBody);
let isDirty = $derived(body !== lastSaved || JSON.stringify(frontmatter) !== JSON.stringify(initialFrontmatter));
let showPreview = $state(true);
```

Orchestration:
- Renders FrontmatterForm (always visible, above editor)
- Renders EditorToolbar
- Conditionally renders MilkdownEditor or CodeMirrorEditor+MarkdownPreview based on mode
- Renders EditorStatusBar
- Mode switching: transfers current body between editors
- Save: `PUT /api/docs/{id}` with `{ frontmatter, body }`
- Commit: shows a simple prompt/modal for commit message, calls `POST /api/git/commit`
- Push: calls `POST /api/git/push`
- Refreshes `gitState` after save/commit/push

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/DocEditor.svelte
git commit -m "feat: add DocEditor orchestrator with dual-mode editing"
```

---

## Task 11: Edit Page Route

**Files:**
- Create: `src/routes/edit/[...path]/+page.server.ts`
- Create: `src/routes/edit/[...path]/+page.svelte`

- [ ] **Step 1: Create server load**

```typescript
import { readDocument } from '$lib/server/docs';
import { loadConfig } from '$lib/server/config';
import { getDocsStatus } from '$lib/server/git';
import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
  const docPath = params.path;
  if (!docPath) throw error(400, 'Document path required');
  const fullPath = docPath.endsWith('.md') ? docPath : `${docPath}.md`;
  try {
    const document = await readDocument(fullPath);
    const config = loadConfig();
    const gitStatus = await getDocsStatus();
    return { frontmatter: document.frontmatter, body: document.body, path: fullPath, config, gitStatus };
  } catch {
    throw error(404, `Document not found: ${fullPath}`);
  }
};
```

- [ ] **Step 2: Create page component**

Renders DocEditor with loaded data. Adds `beforeunload` navigation guard when `isDirty`.

- [ ] **Step 3: Verify edit page works**

Navigate to `/edit/overview` in the browser. Verify the editor loads with content.

- [ ] **Step 4: Commit**

```bash
git add src/routes/edit/
git commit -m "feat: add edit page with dual-mode document editor"
```

---

## Task 12: New Document Workflow

**Files:**
- Create: `src/routes/new/+page.server.ts`
- Create: `src/routes/new/+page.svelte`

- [ ] **Step 1: Create server load**

Load templates from `docs/_templates/` (if directory exists) and config. If no templates directory, return empty templates array.

- [ ] **Step 2: Create new document page**

Two-step flow:
1. Card grid of document types (from config). User clicks a type.
2. FrontmatterForm pre-filled with type. DocEditor with empty body. Filename preview below title: "Will be saved as: `{type}/{type}-{NNN}-{slug}.md`"
3. "Create" button calls `POST /api/docs`, redirects to `/edit/{new-path}` on success.

- [ ] **Step 3: Add "New Document" button to layout/sidebar**

Add a "+ New" button in the sidebar header or layout that links to `/new`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/new/ src/routes/+layout.svelte
git commit -m "feat: add new document creation workflow"
```

---

## Task 13: Git History Page

**Files:**
- Create: `src/routes/history/[...path]/+page.svelte`

- [ ] **Step 1: Create history page**

Client-side data loading from `GET /api/git/history?path={path}`.

Layout: timeline list showing commits for this document:
- Each entry: short hash, author, relative time (compute from date), commit message
- Click a commit to view the document at that point (fetch content from server)
- "View diff" link next to each commit → navigates to `/diff/{path}?from={hash}`

If no git history (empty array), show "No history found" message.

- [ ] **Step 2: Commit**

```bash
git add src/routes/history/
git commit -m "feat: add git history page with commit timeline"
```

---

## Task 14: Git Diff Page

**Files:**
- Create: `src/routes/diff/[...path]/+page.svelte`

- [ ] **Step 1: Create diff page**

Client-side loading from `GET /api/git/diff?path={path}&from={hash}&to={hash}`.

Renders diff with diff2html:
```typescript
import { html as diff2htmlHtml } from 'diff2html';
```

Features:
- Toggle between unified (`line-by-line`) and side-by-side view
- Commit info header with hashes
- "Back to history" link
- Import diff2html CSS

- [ ] **Step 2: Commit**

```bash
git add src/routes/diff/
git commit -m "feat: add git diff page with unified and side-by-side views"
```

---

## Task 15: Integration Testing & Polish

**Files:**
- Various modifications for edge cases

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```
All tests should pass including new git and CRUD tests.

- [ ] **Step 2: Run type check**

```bash
npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json
```

- [ ] **Step 3: Test end-to-end flow**

With dev server running (`DOCSMD_DOCS_DIR=test-docs npm run dev`):
1. Navigate to landing page → click a document → click Edit → verify editor loads
2. Make a change → Save → verify file is updated on disk
3. Try Commit → verify commit is created
4. Switch between Rich Text and Markdown modes → verify content preserved
5. Create new document from /new → verify file created and redirect works
6. View history for a document → verify commits show
7. View diff → verify diff renders

- [ ] **Step 4: Handle edge cases**

- No git repo: git API routes return graceful errors, git indicators hidden
- No remote configured: push returns error message (don't crash)
- Empty document body: editors handle gracefully
- Unsaved changes: beforeunload warns on navigation

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 2 — editing, Git integration, and document management"
```

---

## Acceptance Verification

After all tasks, verify against Phase 2 acceptance criteria:

- [ ] Edit button on documents opens `/edit/{path}` with document loaded
- [ ] FrontmatterForm renders all fields as form inputs
- [ ] Changing frontmatter and saving persists correctly
- [ ] WYSIWYG editor renders and allows editing
- [ ] Markdown editor shows raw source with syntax highlighting
- [ ] Mode switching preserves content
- [ ] WYSIWYG saves as clean Markdown
- [ ] Save writes to disk
- [ ] Commit creates a git commit with message
- [ ] Push pushes to remote
- [ ] Buttons enable/disable based on state
- [ ] Unsaved changes trigger browser warning
- [ ] New document workflow works end-to-end
- [ ] Git history shows commit timeline
- [ ] Git diff renders with diff2html
- [ ] Sidebar shows modified dots
- [ ] Header shows branch name and ahead/behind
