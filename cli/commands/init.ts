import { existsSync, mkdirSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface InitOptions {
  ai?: boolean;
  name?: string;
}

const SUBFOLDERS = [
  'adr',
  'spec',
  'guide',
  'runbook',
  'api',
  'rfc',
  'meeting',
  '_templates',
  '_assets',
];

const DOCSMD_MD_CONTENT = `# DOCSMD.md — Agent Instructions

This file provides instructions for AI agents working with this repository's documentation.

## Document Types

| Type     | Folder      | Purpose                                      | Default Status |
|----------|-------------|----------------------------------------------|----------------|
| adr      | adr/        | Architecture Decision Records                | proposed       |
| spec     | spec/       | Technical specifications                     | draft          |
| guide    | guide/      | How-to guides and tutorials                  | draft          |
| runbook  | runbook/    | Operational runbooks                         | draft          |
| api      | api/        | API reference documentation                  | draft          |
| rfc      | rfc/        | Requests for Comments                        | draft          |
| meeting  | meeting/    | Meeting notes                                | final          |

## Frontmatter Fields

All documents must include at minimum:
\`\`\`yaml
---
title: ""        # required — document title
type: ""         # required — one of the types above
status: ""       # required — lifecycle status
owner: ""        # optional — person responsible
created: ""      # YYYY-MM-DD
updated: ""      # YYYY-MM-DD
tags: []         # optional list of tags
---
\`\`\`

## Reading Rules

1. Always check the frontmatter \`status\` field before treating a document as authoritative.
2. Documents with status \`deprecated\` or \`superseded\` should not be used as ground truth.
3. Check the \`updated\` date to assess recency.
4. For ADRs, the \`decision_date\` field indicates when the decision was made.
5. \`tags\` can be used to find related documents.

## Writing Rules

1. Filenames follow the pattern: \`{type}-{NNN}-{slug}.md\` (e.g., \`adr-001-use-postgresql.md\`).
2. Never edit the \`id\`, \`created\` fields after creation.
3. Always update the \`updated\` field when modifying a document.
4. Use the templates in \`docs/_templates/\` as starting points.
5. Place files in the correct subfolder matching the document type.
6. Write clear, concise titles that describe the content accurately.
7. Keep frontmatter fields consistent with existing documents in the repository.
`;

export async function init(opts: InitOptions, name?: string): Promise<void> {
  const cwd = process.cwd();

  // Validate: must be a git repo
  if (!existsSync(resolve(cwd, '.git'))) {
    log.error('Not a git repository.');
    log.dim('Hint: run git init first, or navigate to your repo root.');
    process.exit(1);
  }

  const docsDir = resolve(cwd, 'docs');
  const created: string[] = [];
  const skipped: string[] = [];

  // Create docs/ folder
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir, { recursive: true });
    created.push('docs/');
  } else {
    skipped.push('docs/');
  }

  // Create subfolders
  for (const folder of SUBFOLDERS) {
    const folderPath = resolve(docsDir, folder);
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
      created.push(`docs/${folder}/`);
    } else {
      skipped.push(`docs/${folder}/`);
    }
  }

  // Copy templates from bundled templates/ dir
  const templatesSource = resolve(__dirname, '..', '..', 'templates');
  const templatesDest = resolve(docsDir, '_templates');

  if (existsSync(templatesSource)) {
    const templateFiles = readdirSync(templatesSource).filter((f) => f.endsWith('.md'));
    for (const tmplFile of templateFiles) {
      const srcPath = join(templatesSource, tmplFile);
      const destPath = join(templatesDest, tmplFile);
      if (!existsSync(destPath)) {
        if (!existsSync(templatesDest)) {
          mkdirSync(templatesDest, { recursive: true });
        }
        copyFileSync(srcPath, destPath);
        created.push(`docs/_templates/${tmplFile}`);
      } else {
        skipped.push(`docs/_templates/${tmplFile}`);
      }
    }
  }

  // Write docs/.docsmd.yml (don't overwrite)
  const configPath = resolve(docsDir, '.docsmd.yml');
  if (!existsSync(configPath)) {
    // Use provided name, or infer from directory name
    const projectName = name ?? cwd.split('/').pop() ?? '';
    const configContent = `spec_version: "0.1.0"\nproject:\n  name: "${projectName}"\n  description: ""\n`;
    writeFileSync(configPath, configContent, 'utf8');
    created.push('docs/.docsmd.yml');
  } else {
    skipped.push('docs/.docsmd.yml');
  }

  // Write docs/overview.md
  const overviewPath = resolve(docsDir, 'overview.md');
  if (!existsSync(overviewPath)) {
    const today = new Date().toISOString().split('T')[0];
    const displayName = name ?? 'docs.md';
    const overviewContent = `---
title: Welcome to ${displayName}
type: doc
status: active
created: ${today}
updated: ${today}
---

# Welcome to ${displayName}

This is your documentation hub. Use the sections below to navigate your docs.

## Document Types

- **ADR** — Architecture Decision Records in \`adr/\`
- **Spec** — Technical specifications in \`spec/\`
- **Guide** — How-to guides in \`guide/\`
- **Runbook** — Operational runbooks in \`runbook/\`
- **API** — API reference docs in \`api/\`
- **RFC** — Requests for Comments in \`rfc/\`
- **Meeting** — Meeting notes in \`meeting/\`

## Getting Started

Browse documentation using the sidebar or run \`docsmd search <query>\` from the command line.
`;
    writeFileSync(overviewPath, overviewContent, 'utf8');
    created.push('docs/overview.md');
  } else {
    skipped.push('docs/overview.md');
  }

  // Optionally generate DOCSMD.md at repo root
  if (opts.ai) {
    const agentFilePath = resolve(cwd, 'DOCSMD.md');
    if (!existsSync(agentFilePath)) {
      writeFileSync(agentFilePath, DOCSMD_MD_CONTENT, 'utf8');
      created.push('DOCSMD.md');
    } else {
      skipped.push('DOCSMD.md');
    }
  }

  // Print summary
  log.header('docs.md init');

  if (created.length > 0) {
    log.success('Created:');
    for (const item of created) {
      log.dim(item);
    }
  }

  if (skipped.length > 0) {
    log.warn('Already exists (skipped):');
    for (const item of skipped) {
      log.dim(item);
    }
  }

  console.log('');
  log.success('Done! Your docs/ folder is ready.');
  log.dim('Run docsmd browse to start the web UI.');
}
