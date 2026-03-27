<script lang="ts">
  import { goto } from '$app/navigation';
  import FrontmatterForm from '$lib/components/FrontmatterForm.svelte';
  import type { DocFrontmatter, DocsMDConfig } from '$lib/types';

  let { data } = $props();

  let selectedType = $state<string | null>(null);
  let frontmatter = $state<DocFrontmatter>({ title: '' });
  let body = $state('');
  let creating = $state(false);
  let createError = $state('');

  let config = $derived(data.config as DocsMDConfig);

  function selectType(typeKey: string) {
    selectedType = typeKey;
    frontmatter = { title: '', type: typeKey, status: config.types[typeKey]?.default_status ?? '' };
    body = '';
    createError = '';

    // Check if a template exists for this type
    const templates = data.templates as Array<{ type: string; frontmatter: Record<string, unknown>; body: string }>;
    const template = templates.find(t => t.type === typeKey);
    if (template) {
      const { type: _t, ...rest } = template.frontmatter as Record<string, unknown>;
      frontmatter = { title: '', type: typeKey, status: config.types[typeKey]?.default_status ?? '', ...rest } as DocFrontmatter;
      body = template.body;
    }
  }

  function handleFrontmatterChange(updated: Partial<DocFrontmatter>) {
    frontmatter = { ...frontmatter, ...updated };
  }

  function slugPreview(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60);
  }

  let filenamePreview = $derived(() => {
    if (!selectedType || !frontmatter.title) return null;
    const slug = slugPreview(frontmatter.title);
    return `${selectedType}/${selectedType}-NNN-${slug || 'untitled'}.md`;
  });

  async function handleCreate() {
    if (!frontmatter.title?.trim()) {
      createError = 'Title is required.';
      return;
    }

    creating = true;
    createError = '';

    try {
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontmatter, body }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        createError = (data as { error?: string }).error || `Server error: ${res.status}`;
        return;
      }

      const result = await res.json() as { id: string; path: string; filename: string };
      // Redirect to edit page: strip .md extension
      const editPath = result.path.replace(/\.md$/, '');
      await goto(`/edit/${editPath}`);
    } catch (e: unknown) {
      createError = e instanceof Error ? e.message : 'An unexpected error occurred.';
    } finally {
      creating = false;
    }
  }

  function handleBack() {
    selectedType = null;
    frontmatter = { title: '' };
    body = '';
    createError = '';
  }
</script>

<div class="new-page">
  {#if selectedType === null}
    <!-- Step 1: Select type -->
    <div class="step step-select">
      <h1 class="page-title">New Document</h1>
      <p class="page-subtitle">Choose a document type to get started.</p>

      <div class="type-grid">
        {#each Object.entries(config.types) as [key, typeCfg] (key)}
          <button
            class="type-card"
            onclick={() => selectType(key)}
            type="button"
          >
            <span class="type-card-label">{typeCfg.label}</span>
            <span class="type-card-desc">{typeCfg.plural}</span>
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <!-- Step 2: Fill details -->
    <div class="step step-details">
      <div class="step-header">
        <button class="btn-back" onclick={handleBack} type="button">
          &larr; Back
        </button>
        <h1 class="page-title">
          New {config.types[selectedType]?.label ?? selectedType}
        </h1>
      </div>

      <div class="form-section">
        <FrontmatterForm
          {frontmatter}
          {config}
          onchange={handleFrontmatterChange}
          isNew={true}
        />

        {#if filenamePreview()}
          <p class="filename-preview">
            Will be saved as: <code>{filenamePreview()}</code>
          </p>
        {/if}
      </div>

      <div class="form-section">
        <label class="field-label" for="doc-body">Content</label>
        <textarea
          id="doc-body"
          class="body-textarea"
          bind:value={body}
          placeholder="Write your document content here (Markdown supported)..."
          rows={12}
        ></textarea>
        <p class="body-hint">You can use the full editor after creating the document.</p>
      </div>

      {#if createError}
        <p class="error-msg" role="alert">{createError}</p>
      {/if}

      <div class="form-actions">
        <button
          class="btn-create"
          onclick={handleCreate}
          disabled={creating || !frontmatter.title?.trim()}
          type="button"
        >
          {creating ? 'Creating…' : 'Create Document'}
        </button>
        <button class="btn-cancel" onclick={handleBack} type="button">
          Cancel
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .new-page {
    max-width: 720px;
    margin: 0 auto;
    padding: var(--spacing-xl) var(--spacing-md);
  }

  .page-title {
    font-family: var(--font-heading);
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 var(--spacing-sm);
  }

  .page-subtitle {
    font-size: var(--text-base);
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-xl);
  }

  /* Type grid */
  .type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--spacing-md);
  }

  .type-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.35rem;
    padding: var(--spacing-md) var(--spacing-lg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg);
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  }

  .type-card:hover {
    border-color: var(--color-accent);
    background: var(--color-accent-bg);
    box-shadow: var(--shadow-md);
  }

  .type-card-label {
    font-size: var(--text-base);
    font-weight: 700;
    color: var(--color-text);
  }

  .type-card-desc {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  /* Step header */
  .step-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
  }

  .btn-back {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.75rem;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: border-color 0.12s ease, color 0.12s ease;
    flex-shrink: 0;
  }

  .btn-back:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  /* Form sections */
  .form-section {
    margin-bottom: var(--spacing-xl);
    padding: var(--spacing-lg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg);
  }

  .filename-preview {
    margin: var(--spacing-md) 0 0;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .filename-preview code {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    background: var(--color-bg-secondary);
    padding: 0.15rem 0.4rem;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
  }

  .field-label {
    display: block;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.4rem;
  }

  .body-textarea {
    width: 100%;
    resize: vertical;
    padding: 0.6rem 0.75rem;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 1.6;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    color: var(--color-text);
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
  }

  .body-textarea:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 20%, transparent);
  }

  .body-hint {
    margin: 0.4rem 0 0;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  /* Error */
  .error-msg {
    margin-bottom: var(--spacing-md);
    padding: 0.6rem var(--spacing-md);
    border-radius: var(--radius-sm);
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: var(--color-danger);
    font-size: var(--text-sm);
  }

  /* Actions */
  .form-actions {
    display: flex;
    gap: var(--spacing-md);
    align-items: center;
  }

  .btn-create {
    padding: 0.5rem 1.25rem;
    font-size: var(--text-sm);
    font-weight: 600;
    border: none;
    border-radius: var(--radius-sm);
    background: var(--color-accent);
    color: #fff;
    cursor: pointer;
    transition: background 0.12s ease, opacity 0.12s ease;
  }

  .btn-create:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  .btn-create:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-cancel {
    padding: 0.5rem 1rem;
    font-size: var(--text-sm);
    font-weight: 500;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: border-color 0.12s ease, color 0.12s ease;
  }

  .btn-cancel:hover {
    border-color: var(--color-text-muted);
    color: var(--color-text);
  }

  @media (max-width: 600px) {
    .type-grid {
      grid-template-columns: 1fr 1fr;
    }

    .step-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
