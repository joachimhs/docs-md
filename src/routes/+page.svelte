<script lang="ts">
  import { goto } from '$app/navigation';
  import { docs } from '$lib/stores/docs.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  let quickSearch = $state('');

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && quickSearch.trim()) {
      goto(`/search?q=${encodeURIComponent(quickSearch.trim())}`);
    }
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  const totalDocs = $derived(docs.manifest?.length ?? 0);
  const totalTypes = $derived(docs.types?.length ?? 0);

  const typeDescriptions: Record<string, string> = {
    adr: 'Record architectural decisions with context, alternatives, and consequences. Use when choosing technologies, patterns, or approaches that affect the system.',
    spec: 'Detail how a system or feature works technically. Use for designs that need review before implementation.',
    guide: 'Step-by-step instructions for accomplishing a task. Use for onboarding, setup, workflows, and how-to content.',
    runbook: 'Operational procedures for incidents, deployments, and maintenance. Use for anything someone might need to follow under pressure.',
    api: 'Document API endpoints, request/response formats, and integration details.',
    rfc: 'Propose changes for team discussion. Use when a decision needs broader input before committing.',
    meeting: 'Capture decisions, action items, and context from meetings.',
    doc: 'General documents that don\'t fit a specific type. Files at the docs root get this type automatically.',
  };

  let agentSectionOpen = $state(false);

  const agentInstructions = `# Project Documentation (docs.md)

This project uses docs.md for documentation. All documentation lives in the \`docs/\` directory.

## For AI Agents

### Discovery
Scan the \`docs/\` directory for \`.md\` files with YAML frontmatter. Or, if the docs.md server is running, call \`GET /api/docs\` to get a complete inventory of all documents with their IDs, titles, types, statuses, paths, tags, and summaries.

### Reading Documents
Documents are Markdown files with YAML frontmatter. Parse with any YAML frontmatter library (e.g., \`gray-matter\` for Node.js, \`python-frontmatter\` for Python):

\`\`\`
---
title: "Document Title"
type: adr
status: accepted
tags: [tag1, tag2]
---

# Markdown content here
\`\`\`

### Creating Documents
1. Read the template from \`docs/_templates/{type}.md\` if it exists
2. Fill in the frontmatter fields (title is required)
3. Write the Markdown body
4. Save to \`docs/{type}/{type}-{NNN}-{slug}.md\`
5. The manifest auto-updates on next server start, or call \`POST /api/manifest\`

### Document Types
| Type | Folder | Purpose |
|------|--------|---------|
| adr | docs/adr/ | Architectural Decision Records |
| spec | docs/spec/ | Technical Specifications |
| guide | docs/guide/ | How-to Guides |
| runbook | docs/runbook/ | Operational Runbooks |
| api | docs/api/ | API Documentation |
| rfc | docs/rfc/ | Requests for Comments |
| meeting | docs/meeting/ | Meeting Notes |
| doc | docs/ (root) | General Documents |

### Frontmatter Fields
| Field | Required | Description |
|-------|----------|-------------|
| title | yes | Document title |
| type | no | Document type (inferred from folder if omitted) |
| status | no | Current status (defaults to type's default) |
| owner | no | Author, convention: @username |
| created | no | Creation date, ISO 8601: "2026-03-27" |
| updated | no | Last update date |
| tags | no | Array: [tag1, tag2] |

### Updating Documents
1. Read the existing file and parse its frontmatter
2. Merge your changes into the frontmatter (do not replace, merge)
3. Replace the body if needed
4. Set the \`updated\` field to today's date
5. Write the file back using gray-matter's \`matter.stringify(body, frontmatter)\`
6. Call \`POST /api/manifest\` to update the index

Or use the API: \`PUT /api/docs/{id}\` with \`{ frontmatter: { status: "accepted" }, body: "new content" }\`

### Archiving Documents
To soft-delete, move the file to \`docs/_archive/{original-path}\`. The archived document is excluded from the manifest and search index.

Or use the API: \`DELETE /api/docs/{id}\`

### API Endpoints for Agents
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/docs | List all documents (filterable by type, status, tag) |
| POST | /api/docs | Create new document |
| GET | /api/docs/{id} | Read single document |
| PUT | /api/docs/{id} | Update document |
| DELETE | /api/docs/{id} | Archive document |
| POST | /api/manifest | Regenerate manifest index |
| GET | /api/search?q=... | Full-text search |

### Rules
- Do not change the \`id\` or \`created\` fields after creation
- Do not rename files (it breaks Git history)
- Update the \`updated\` date when making changes
- Quote date strings in YAML: \`created: "2026-03-27"\` (not unquoted)
- The \`title\` field is required — documents without it are ignored
- Use sequential numbering in filenames: \`{type}-{NNN}-{slug}.md\`
- Images go in \`docs/_assets/\` — upload via \`POST /api/assets\``;
</script>

<div class="landing">
  <section class="hero">
    <h1 class="project-name">{docs.config?.project.name || 'docs.md'}</h1>
    {#if docs.config?.project.description}
      <p class="project-description">{docs.config.project.description}</p>
    {/if}
    <p class="summary">{totalDocs} documents across {totalTypes} types</p>

    {#if totalDocs > 0}
      <div class="quick-search">
        <input
          type="search"
          bind:value={quickSearch}
          onkeydown={handleSearchKeydown}
          placeholder="Quick search… press Enter to search"
          class="quick-search-input"
        />
      </div>
    {/if}
  </section>

  {#if totalDocs === 0}
    <div class="empty-state">
      <p class="empty-state-message">No documents found. Add Markdown files to your docs/ folder to get started.</p>
    </div>
  {/if}

  {#if Object.keys(docs.byType).length > 0}
    <section class="types-section">
      <h2 class="section-title">Document Types</h2>
      <div class="type-grid">
        {#each Object.entries(docs.byType) as [type, typeDocs]}
          {@const typeConfig = docs.config?.types?.[type]}
          <a href="/search?type={type}" class="type-card">
            <div class="type-icon">{typeConfig?.icon || '📄'}</div>
            <div class="type-info">
              <span class="type-label">{typeConfig?.label || type}</span>
              <span class="type-count">{typeDocs.length} {typeDocs.length === 1 ? 'document' : 'documents'}</span>
            </div>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <section class="type-reference">
    <h2 class="section-title">Type Reference</h2>
    <div class="type-list">
      {#each Object.entries(docs.config?.types || {}) as [key, typeConfig]}
        <div class="type-entry">
          <div class="type-entry-header">
            <span class="type-entry-label" style="color: var(--badge-{key}, var(--color-text))">{typeConfig.label}</span>
            <code class="type-entry-folder">docs/{typeConfig.folder || '(root)'}/</code>
          </div>
          <p class="type-entry-description">{typeDescriptions[key] || typeConfig.plural}</p>
          <div class="type-entry-statuses">
            {#each typeConfig.statuses as status}
              <span class="status-chip" class:default={status === typeConfig.default_status}>{status}</span>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="agent-section">
    <button class="accordion-toggle" onclick={() => agentSectionOpen = !agentSectionOpen}>
      <span class="accordion-icon" class:open={agentSectionOpen}>&#9654;</span>
      <h2 class="section-title" style="margin: 0;">Agent Instructions (CLAUDE.md / AGENTS.md)</h2>
    </button>
    {#if agentSectionOpen}
      <div class="agent-content">
        <p class="agent-hint">Copy the content below into your project's <code>CLAUDE.md</code> or <code>AGENTS.md</code> file so coding agents know how to read and write documentation.</p>
        <div class="agent-instructions-wrapper">
          <button class="copy-btn" onclick={() => { navigator.clipboard.writeText(agentInstructions); }}>
            Copy to clipboard
          </button>
          <pre class="agent-instructions">{agentInstructions}</pre>
        </div>
      </div>
    {/if}
  </section>

  {#if docs.recentDocs.length > 0}
    <section class="recent-section">
      <h2 class="section-title">Recently Updated</h2>
      <ul class="recent-list">
        {#each docs.recentDocs as doc}
          <li class="recent-item">
            <a href="/doc/{doc.path}" class="recent-title">{doc.title}</a>
            <div class="recent-meta">
              <StatusBadge status={doc.type} type={doc.type} />
              {#if doc.updated}
                <span class="recent-date">{formatDate(doc.updated)}</span>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

<style>
  .landing {
    max-width: 960px;
    margin: 0 auto;
    padding: var(--spacing-xl) var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }

  .hero {
    text-align: center;
    padding: var(--spacing-xl) 0;
  }

  .project-name {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 var(--spacing-sm);
    color: var(--color-text);
  }

  .project-description {
    font-size: var(--text-lg);
    color: var(--color-text-muted);
    margin: 0 0 var(--spacing-sm);
  }

  .summary {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-lg);
  }

  .quick-search {
    max-width: 500px;
    margin: 0 auto;
  }

  .quick-search-input {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--text-base);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    color: var(--color-text);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  .quick-search-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .empty-state {
    text-align: center;
    padding: var(--spacing-xl) var(--spacing-md);
    border: 2px dashed var(--color-border);
    border-radius: 12px;
    background: var(--color-bg-secondary);
  }

  .empty-state-message {
    color: var(--color-text-muted);
    font-size: var(--text-base);
    margin: 0;
  }

  .section-title {
    font-size: var(--text-lg);
    font-weight: 700;
    margin: 0 0 var(--spacing-md);
    color: var(--color-text);
  }

  .type-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }

  @media (min-width: 480px) {
    .type-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (min-width: 720px) {
    .type-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .type-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    text-decoration: none;
    color: var(--color-text);
    transition: box-shadow 0.15s, border-color 0.15s, transform 0.1s;
  }

  .type-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: var(--color-primary);
    transform: translateY(-1px);
  }

  .type-icon {
    font-size: 1.75rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .type-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .type-label {
    font-weight: 600;
    font-size: var(--text-sm);
    text-transform: capitalize;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .type-count {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-top: 2px;
  }

  .recent-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .recent-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: 6px;
    transition: background 0.1s;
  }

  .recent-item:hover {
    background: var(--color-bg-secondary);
  }

  .recent-title {
    color: var(--color-text);
    text-decoration: none;
    font-size: var(--text-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
  }

  .recent-title:hover {
    color: var(--color-primary);
    text-decoration: underline;
  }

  .recent-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-shrink: 0;
  }

  .recent-date {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  /* Type Reference */
  .type-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .type-entry {
    padding: var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-secondary);
  }

  .type-entry-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
  }

  .type-entry-label {
    font-weight: 700;
    font-size: var(--text-base);
  }

  .type-entry-folder {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    background: var(--color-bg-tertiary);
    padding: 0.1em 0.4em;
    border-radius: 3px;
  }

  .type-entry-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-sm);
    line-height: 1.5;
  }

  .type-entry-statuses {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .status-chip {
    font-size: 0.7rem;
    padding: 0.1em 0.4em;
    border-radius: 3px;
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .status-chip.default {
    background: var(--color-accent-bg);
    color: var(--color-accent);
    font-weight: 600;
  }

  /* Agent Instructions Accordion */
  .accordion-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    width: 100%;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: var(--spacing-md);
    cursor: pointer;
    color: var(--color-text);
    text-align: left;
    transition: background 0.15s;
  }

  .accordion-toggle:hover {
    background: var(--color-bg-secondary);
  }

  .accordion-icon {
    font-size: 0.75rem;
    transition: transform 0.2s;
    flex-shrink: 0;
  }

  .accordion-icon.open {
    transform: rotate(90deg);
  }

  .agent-content {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-secondary);
  }

  .agent-hint {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-md);
    line-height: 1.5;
  }

  .agent-hint code {
    background: var(--color-bg-tertiary);
    padding: 0.15em 0.35em;
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: 0.875em;
  }

  .agent-instructions-wrapper {
    position: relative;
  }

  .copy-btn {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    padding: 0.3em 0.7em;
    font-size: var(--text-xs);
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    color: var(--color-text-secondary);
    z-index: 1;
  }

  .copy-btn:hover {
    background: var(--color-accent-bg);
    color: var(--color-accent);
  }

  .agent-instructions {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: var(--spacing-md);
    padding-top: calc(var(--spacing-md) + 1.5rem);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: var(--color-text);
    max-height: 500px;
    overflow-y: auto;
  }
</style>
