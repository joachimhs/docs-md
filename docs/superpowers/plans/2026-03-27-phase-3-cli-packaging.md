# Phase 3 — CLI Packaging & AI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the SvelteKit app as a globally installable npm CLI (`npm i -g docsmd`) with commands: browse, init, manifest, search, plus AI agent discoverability.

**Architecture:** A `cli/` directory alongside `src/` with its own tsconfig. CLI is built with tsup (ESM, externals), web app with vite (adapter-node). Both outputs ship in the npm package. CLI commands duplicate minimal doc-scanning logic (can't import $lib).

**Tech Stack:** commander, chalk, open, tsup, gray-matter, flexsearch

**Spec:** `PHASE-3-CLI-AND-AI.md`. All refs to "specmd" in spec are "docsmd" in our codebase.

---

## File Structure

```
cli/
  index.ts                          # Commander.js entry (#!/usr/bin/env node)
  commands/
    browse.ts                       # Start pre-built SvelteKit server
    init.ts                         # Scaffold docs/ folder
    manifest.ts                     # Scan docs, print summary
    search.ts                       # CLI full-text search
  lib/
    scan.ts                         # Standalone doc scanner (gray-matter, no $lib)
    logger.ts                       # Chalk-based output helpers
templates/
  adr.md                            # ADR template
  spec.md                           # Spec template
  guide.md                          # Guide template
  runbook.md                        # Runbook template
  api.md                            # API template
  rfc.md                            # RFC template
  meeting.md                        # Meeting template
  .docsmd.yml                       # Default config
tsconfig.cli.json                   # CLI-specific TS config
.npmignore                          # Exclude source from npm package
```

Modified:
```
package.json                        # bin, files, scripts, new deps
.gitignore                          # Add build/, dist/
```

---

## Task 1: Dependencies + Build Config

**Files:**
- Modify: `package.json`
- Create: `tsconfig.cli.json`
- Create: `.npmignore`
- Modify: `.gitignore`

- [ ] **Step 1: Install CLI dependencies**

```bash
npm install commander chalk open
npm install -D tsup
```

- [ ] **Step 2: Update package.json**

Add/modify these fields:
```json
{
  "name": "docsmd",
  "version": "0.1.0",
  "description": "Git-native documentation system with web UI and AI agent support",
  "bin": {
    "docsmd": "./dist/cli/index.js"
  },
  "files": [
    "dist/",
    "build/",
    "templates/"
  ],
  "engines": {
    "node": ">=20.0.0"
  }
}
```

Add build scripts:
```json
{
  "scripts": {
    "build": "npm run build:web && npm run build:cli",
    "build:web": "vite build",
    "build:cli": "tsup cli/index.ts --format esm --out-dir dist/cli --target node20 --shims --external commander --external chalk --external open --external gray-matter --external flexsearch --external simple-git --external js-yaml"
  }
}
```

Keep existing `dev`, `preview`, `test`, `check` scripts.

Move `gray-matter`, `flexsearch`, `simple-git`, `js-yaml` from devDependencies to dependencies (they're needed at runtime by the CLI).

- [ ] **Step 3: Create tsconfig.cli.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist/cli",
    "rootDir": "cli",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["cli/**/*.ts"]
}
```

- [ ] **Step 4: Create .npmignore**

```
src/
cli/
.svelte-kit/
svelte.config.js
vite.config.ts
tsconfig.json
tsconfig.cli.json
*.test.ts
*.spec.ts
test-docs/
tests/
.github/
.git/
.gitignore
.env*
.claude/
CLAUDE.md
AGENTS.md
.DS_Store
node_modules/
docs/superpowers/
```

- [ ] **Step 5: Update .gitignore**

Add `build/` and `dist/` to .gitignore.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.cli.json .npmignore .gitignore
git commit -m "chore: add CLI build config, tsup, commander, chalk"
```

---

## Task 2: CLI Scaffolding + Logger

**Files:**
- Create: `cli/index.ts`
- Create: `cli/lib/logger.ts`

- [ ] **Step 1: Create logger utility**

```typescript
// cli/lib/logger.ts
import chalk from 'chalk';

export const log = {
  info: (msg: string) => console.log(msg),
  success: (msg: string) => console.log(chalk.green(`  ✓ ${msg}`)),
  error: (msg: string) => console.error(chalk.red(`  ✗ ${msg}`)),
  warn: (msg: string) => console.log(chalk.yellow(`  ⚠ ${msg}`)),
  dim: (msg: string) => console.log(chalk.dim(`  ${msg}`)),
  header: (title: string) => console.log(chalk.bold(`\n  ${title}\n`)),
};
```

- [ ] **Step 2: Create CLI entry point**

```typescript
// cli/index.ts
#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '..', '..', 'package.json'), 'utf8')
);

const program = new Command();

program
  .name('docsmd')
  .description('Git-native project documentation system')
  .version(pkg.version);

program
  .command('browse')
  .alias('b')
  .description('Launch the web UI')
  .option('-p, --port <number>', 'port number', '5176')
  .option('--no-open', 'do not open browser')
  .option('--host <address>', 'host address', 'localhost')
  .action(async (options) => {
    const { startServer } = await import('./commands/browse.js');
    await startServer(options);
  });

program
  .command('init [projectName]')
  .description('Initialize docs.md in the current repository')
  .option('--no-templates', 'skip creating template files')
  .option('--ai', 'generate DOCSMD.md agent instruction file')
  .action(async (projectName, options) => {
    const { init } = await import('./commands/init.js');
    await init(projectName, options);
  });

program
  .command('manifest')
  .description('Scan docs and print document summary')
  .action(async () => {
    const { manifest } = await import('./commands/manifest.js');
    await manifest();
  });

program
  .command('search <query>')
  .description('Search documentation')
  .option('-t, --type <type>', 'filter by type')
  .option('-s, --status <status>', 'filter by status')
  .option('--plain', 'machine-readable output')
  .option('-l, --limit <number>', 'max results', '10')
  .action(async (query, options) => {
    const { search } = await import('./commands/search.js');
    await search(query, options);
  });

program.parse();
```

- [ ] **Step 3: Verify CLI builds**

```bash
npx tsup cli/index.ts --format esm --out-dir dist/cli --target node20 --shims --external commander --external chalk --external open --external gray-matter --external flexsearch --external simple-git --external js-yaml
```

- [ ] **Step 4: Commit**

```bash
git add cli/
git commit -m "feat: add CLI entry point with commander.js"
```

---

## Task 3: Standalone Doc Scanner

**Files:**
- Create: `cli/lib/scan.ts`

- [ ] **Step 1: Create standalone scanner**

This duplicates the core scanning logic from `src/lib/server/docs.ts` but uses no SvelteKit imports. Used by `manifest` and `search` commands.

```typescript
// cli/lib/scan.ts
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, relative, join, extname, basename } from 'node:path';
import matter from 'gray-matter';

export interface DocEntry {
  id: string;
  title: string;
  type: string;
  status: string;
  owner: string;
  created: string;
  updated: string;
  tags: string[];
  path: string;
  summary: string;
  word_count: number;
  body: string; // raw body for search indexing
}

export function scanDocs(docsRoot: string): DocEntry[] {
  const entries: DocEntry[] = [];

  function walk(dir: string) {
    if (!existsSync(dir)) return;
    for (const item of readdirSync(dir)) {
      if (item.startsWith('_') || item.startsWith('.')) continue;
      const full = join(dir, item);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (extname(item) === '.md') {
        const entry = parseEntry(full, docsRoot);
        if (entry) entries.push(entry);
      }
    }
  }

  walk(docsRoot);
  return entries.sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title));
}

function parseEntry(absolutePath: string, docsRoot: string): DocEntry | null {
  try {
    const raw = readFileSync(absolutePath, 'utf8');
    const { data, content } = matter(raw);
    if (!data.title) return null;

    const relPath = relative(docsRoot, absolutePath);
    const parts = relPath.split('/');
    const type = data.type || (parts.length > 1 ? parts[0] : 'doc');
    const name = basename(relPath, '.md');
    const id = name.startsWith(type + '-') ? name : `${type}-${name}`;

    // Extract first paragraph as summary
    const lines = content.trim().split('\n');
    const paraLines: string[] = [];
    let started = false;
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('#')) continue;
      if (!t && !started) continue;
      if (!t && started) break;
      started = true;
      paraLines.push(t);
    }
    const summary = data.summary || paraLines.join(' ').slice(0, 200);
    const word_count = content.trim().split(/\s+/).filter(Boolean).length;

    return {
      id, title: data.title, type,
      status: data.status || 'draft',
      owner: data.owner || '',
      created: data.created || '',
      updated: data.updated || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      path: relPath, summary, word_count,
      body: content,
    };
  } catch { return null; }
}
```

- [ ] **Step 2: Commit**

```bash
git add cli/lib/scan.ts
git commit -m "feat: add standalone doc scanner for CLI commands"
```

---

## Task 4: Browse Command

**Files:**
- Create: `cli/commands/browse.ts`

- [ ] **Step 1: Implement browse command**

```typescript
// cli/commands/browse.ts
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface BrowseOptions {
  port: string;
  open: boolean;
  host: string;
}

export async function startServer(options: BrowseOptions) {
  const port = parseInt(options.port, 10);
  const host = options.host;

  if (!existsSync('.git') && !existsSync('../.git')) {
    console.error(chalk.red('Error: Not inside a Git repository.'));
    console.error('Run git init first, then docsmd init.');
    process.exit(1);
  }

  if (!existsSync('docs')) {
    console.error(chalk.red('Error: No docs/ folder found.'));
    console.error(`Run ${chalk.cyan('docsmd init')} to create the documentation structure.`);
    process.exit(1);
  }

  process.env.PORT = String(port);
  process.env.HOST = host;
  process.env.ORIGIN = `http://${host}:${port}`;
  process.env.DOCSMD_REPO_ROOT = process.cwd();

  const handlerPath = resolve(__dirname, '..', '..', 'build', 'handler.js');

  if (!existsSync(handlerPath)) {
    console.error(chalk.red('Error: SvelteKit build not found.'));
    console.error(`Expected at: ${handlerPath}`);
    process.exit(1);
  }

  console.log(chalk.bold('\n  docs.md\n'));
  console.log(`  ${chalk.dim('Repository:')}  ${process.cwd()}`);
  console.log(`  ${chalk.dim('URL:')}         ${chalk.cyan(`http://${host}:${port}`)}`);
  console.log(`  ${chalk.dim('Press')}        ${chalk.yellow('Ctrl+C')} to stop\n`);

  const { handler } = await import(handlerPath);

  const server = createServer((req: any, res: any) => {
    handler(req, res, () => {
      res.writeHead(404);
      res.end('Not found');
    });
  });

  server.listen(port, host, () => {
    console.log(chalk.green('  ✓ Server ready\n'));
    if (options.open) {
      import('open').then(({ default: open }) => {
        open(`http://${host}:${port}`);
      });
    }
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(chalk.red(`Error: Port ${port} is already in use.`));
      console.error(`Try: ${chalk.cyan(`docsmd browse --port ${port + 1}`)}`);
      process.exit(1);
    }
    throw err;
  });

  const shutdown = () => {
    console.log(chalk.dim('\n  Shutting down...'));
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
```

- [ ] **Step 2: Commit**

```bash
git add cli/commands/browse.ts
git commit -m "feat: add docsmd browse command"
```

---

## Task 5: Init Command

**Files:**
- Create: `cli/commands/init.ts`

- [ ] **Step 1: Implement init command**

Creates the docs/ folder structure, copies templates, writes config and overview page. If `--ai` flag, generates DOCSMD.md.

Key behavior:
- Check for `.git` — error if not a git repo
- Create `docs/` and subfolders: `adr/`, `spec/`, `guide/`, `runbook/`, `api/`, `rfc/`, `meeting/`, `_templates/`, `_assets/`
- Copy templates from bundled `templates/` dir to `docs/_templates/`
- Write `docs/.docsmd.yml` (don't overwrite if exists)
- Write `docs/overview.md` with project name
- If `--ai`: generate `DOCSMD.md` at repo root with agent instructions
- Print summary

The templates directory is resolved relative to the CLI's installed location:
```typescript
const templatesDir = resolve(__dirname, '..', '..', 'templates');
```

- [ ] **Step 2: Commit**

```bash
git add cli/commands/init.ts
git commit -m "feat: add docsmd init command"
```

---

## Task 6: Manifest + Search Commands

**Files:**
- Create: `cli/commands/manifest.ts`
- Create: `cli/commands/search.ts`

- [ ] **Step 1: Implement manifest command**

Scans docs/, prints document count and type breakdown. Does NOT write a file (our manifest is in-memory for the server; CLI just reports).

```typescript
// cli/commands/manifest.ts
import chalk from 'chalk';
import { resolve } from 'node:path';
import { scanDocs } from '../lib/scan.js';

export async function manifest() {
  const docsRoot = resolve(process.cwd(), 'docs');
  const docs = scanDocs(docsRoot);

  // Group by type
  const byType: Record<string, number> = {};
  for (const doc of docs) {
    byType[doc.type] = (byType[doc.type] || 0) + 1;
  }

  console.log(chalk.bold(`\n  docs.md — ${docs.length} documents\n`));
  for (const [type, count] of Object.entries(byType).sort()) {
    console.log(`  ${chalk.cyan(type.padEnd(12))} ${count}`);
  }
  console.log();
}
```

- [ ] **Step 2: Implement search command**

Scans docs/, builds FlexSearch index, queries, prints results.

```typescript
// cli/commands/search.ts
import chalk from 'chalk';
import { resolve } from 'node:path';
import { scanDocs, type DocEntry } from '../lib/scan.js';
import FlexSearch from 'flexsearch';

interface SearchOptions {
  type?: string;
  status?: string;
  plain: boolean;
  limit: string;
}

export async function search(query: string, options: SearchOptions) {
  const docsRoot = resolve(process.cwd(), 'docs');
  const docs = scanDocs(docsRoot);

  // Build index
  const index = new FlexSearch.Document({
    document: { id: 'id', index: ['title', 'body', 'tags'] },
  });

  for (const doc of docs) {
    index.add({ id: doc.id, title: doc.title, body: doc.body, tags: doc.tags.join(' ') });
  }

  // Search
  const rawResults = index.search(query, { limit: parseInt(options.limit) * 2, enrich: true });
  const ids = new Set<string>();
  for (const fieldResult of rawResults) {
    for (const hit of fieldResult.result) {
      ids.add(typeof hit === 'object' ? String(hit.id) : String(hit));
    }
  }

  let results = docs.filter(d => ids.has(d.id));
  if (options.type) results = results.filter(d => d.type === options.type);
  if (options.status) results = results.filter(d => d.status === options.status);
  results = results.slice(0, parseInt(options.limit));

  if (options.plain) {
    for (const r of results) {
      console.log(`${r.id}\t${r.title}\t${r.type}\t${r.status}\t${r.path}`);
    }
  } else {
    console.log(chalk.bold(`\n  Search results for "${query}"\n`));
    if (results.length === 0) {
      console.log(chalk.dim('  No results found.\n'));
      return;
    }
    for (const r of results) {
      console.log(`  ${chalk.cyan(r.id.padEnd(20))} ${r.title}`);
      console.log(`  ${chalk.dim(r.type.padEnd(20))} ${chalk.yellow(`[${r.status}]`)}  ${r.path}`);
      if (r.summary) console.log(`  ${chalk.dim(r.summary.slice(0, 100))}`);
      console.log();
    }
    console.log(chalk.dim(`  ${results.length} results\n`));
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add cli/commands/manifest.ts cli/commands/search.ts
git commit -m "feat: add docsmd manifest and search commands"
```

---

## Task 7: Document Templates

**Files:**
- Create: `templates/adr.md`
- Create: `templates/spec.md`
- Create: `templates/guide.md`
- Create: `templates/runbook.md`
- Create: `templates/api.md`
- Create: `templates/rfc.md`
- Create: `templates/meeting.md`
- Create: `templates/.docsmd.yml`

- [ ] **Step 1: Create all 7 templates + default config**

Each template has frontmatter with empty/default values and body with section headings and italicized guidance text. See spec for ADR template example. Create similar for all types.

The `.docsmd.yml` is the default config:
```yaml
spec_version: "0.1.0"
project:
  name: ""
  description: ""
```

- [ ] **Step 2: Commit**

```bash
git add templates/
git commit -m "feat: add bundled document templates for docsmd init"
```

---

## Task 8: Build + Verify

- [ ] **Step 1: Build web app**

```bash
npm run build:web
```
Expected: `build/` directory created with adapter-node output including `handler.js`.

- [ ] **Step 2: Build CLI**

```bash
npm run build:cli
```
Expected: `dist/cli/index.js` created.

- [ ] **Step 3: Test CLI locally**

```bash
node dist/cli/index.js --version
node dist/cli/index.js --help
```

- [ ] **Step 4: Test init in a temp directory**

```bash
cd /tmp && mkdir docsmd-test && cd docsmd-test && git init
node /path/to/specmd/dist/cli/index.js init "Test Project"
ls docs/
```

- [ ] **Step 5: Test manifest and search**

```bash
node /path/to/specmd/dist/cli/index.js manifest
node /path/to/specmd/dist/cli/index.js search "documentation"
```

- [ ] **Step 6: Test browse**

```bash
node /path/to/specmd/dist/cli/index.js browse --no-open --port 5177
# Verify server starts, then Ctrl+C
```

- [ ] **Step 7: Run existing tests (no regressions)**

```bash
npx vitest run
```

- [ ] **Step 8: Commit build config fixes if any**

```bash
git add -A && git commit -m "feat: complete Phase 3 CLI packaging"
```
