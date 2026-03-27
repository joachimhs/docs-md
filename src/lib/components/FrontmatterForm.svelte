<script lang="ts">
  import type { DocFrontmatter, DocsMDConfig } from '$lib/types';

  let { frontmatter, config, onchange, isNew = false }: {
    frontmatter: DocFrontmatter;
    config: DocsMDConfig | null;
    onchange: (updated: Partial<DocFrontmatter>) => void;
    isNew?: boolean;
  } = $props();

  // Local state mirroring the prop values
  let title = $state(frontmatter.title ?? '');
  let type = $state(frontmatter.type ?? '');
  let status = $state(frontmatter.status ?? '');
  let owner = $state(frontmatter.owner ?? '');
  let tags = $state<string[]>(frontmatter.tags ? [...frontmatter.tags] : []);
  let tagInput = $state('');

  // Derive the available types from config
  let typeOptions = $derived(
    config ? Object.entries(config.types).map(([key, cfg]) => ({ key, label: cfg.label })) : []
  );

  // Derive statuses for the currently selected type
  let statusOptions = $derived(
    type && config?.types[type]?.statuses ? config.types[type].statuses : []
  );

  // When type changes reset status to the default for the new type (if current status not valid)
  $effect(() => {
    if (type && config?.types[type]) {
      const validStatuses = config.types[type].statuses;
      if (!validStatuses.includes(status)) {
        status = config.types[type].default_status ?? validStatuses[0] ?? '';
      }
    }
  });

  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  function handleTitleInput(e: Event) {
    title = (e.target as HTMLInputElement).value;
    onchange({ title });
  }

  function handleTypeChange(e: Event) {
    type = (e.target as HTMLSelectElement).value;
    onchange({ type });
  }

  function handleStatusChange(e: Event) {
    status = (e.target as HTMLSelectElement).value;
    onchange({ status });
  }

  function handleOwnerInput(e: Event) {
    owner = (e.target as HTMLInputElement).value;
    onchange({ owner });
  }

  function addTag(raw: string) {
    const trimmed = raw.trim().replace(/,$/, '').trim();
    if (trimmed && !tags.includes(trimmed)) {
      tags = [...tags, trimmed];
      onchange({ tags });
    }
    tagInput = '';
  }

  function handleTagKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      tags = tags.slice(0, -1);
      onchange({ tags });
    }
  }

  function handleTagBlur() {
    if (tagInput.trim()) {
      addTag(tagInput);
    }
  }

  function removeTag(tag: string) {
    tags = tags.filter(t => t !== tag);
    onchange({ tags });
  }
</script>

<div class="frontmatter-form">
  <!-- Row 1: Title (full width) -->
  <div class="field field--full">
    <label class="field-label" for="fm-title">Title <span class="required">*</span></label>
    <input
      id="fm-title"
      type="text"
      class="field-input"
      value={title}
      oninput={handleTitleInput}
      placeholder="Document title"
      required
      autofocus={isNew}
    />
  </div>

  <!-- Row 2: Type + Status -->
  <div class="field-row">
    <div class="field">
      <label class="field-label" for="fm-type">Type</label>
      <select id="fm-type" class="field-select" value={type} onchange={handleTypeChange}>
        <option value="">— select type —</option>
        {#each typeOptions as opt (opt.key)}
          <option value={opt.key}>{opt.label}</option>
        {/each}
      </select>
    </div>

    <div class="field">
      <label class="field-label" for="fm-status">Status</label>
      <select id="fm-status" class="field-select" value={status} onchange={handleStatusChange} disabled={statusOptions.length === 0}>
        <option value="">— select status —</option>
        {#each statusOptions as s (s)}
          <option value={s}>{s}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Row 3: Owner -->
  <div class="field">
    <label class="field-label" for="fm-owner">Owner</label>
    <input
      id="fm-owner"
      type="text"
      class="field-input"
      value={owner}
      oninput={handleOwnerInput}
      placeholder="@username"
    />
  </div>

  <!-- Row 4: Tags -->
  <div class="field field--full">
    <label class="field-label" for="fm-tag-input">Tags</label>
    <div class="tags-container">
      {#each tags as tag (tag)}
        <span class="tag-pill">
          {tag}
          <button
            type="button"
            class="tag-remove"
            onclick={() => removeTag(tag)}
            aria-label="Remove tag {tag}"
          >×</button>
        </span>
      {/each}
      <input
        id="fm-tag-input"
        type="text"
        class="tag-input"
        bind:value={tagInput}
        onkeydown={handleTagKeydown}
        onblur={handleTagBlur}
        placeholder={tags.length === 0 ? 'Add tags (Enter or comma to add)' : ''}
      />
    </div>
  </div>

  <!-- Row 5: Dates (read-only) -->
  {#if !isNew}
    <div class="field-row">
      <div class="field">
        <span class="field-label">Created</span>
        <span class="field-readonly">{formatDate(frontmatter.created)}</span>
      </div>
      <div class="field">
        <span class="field-label">Updated</span>
        <span class="field-readonly">{formatDate(frontmatter.updated)}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .frontmatter-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md, 1rem);
  }

  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md, 1rem);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .field--full {
    grid-column: 1 / -1;
  }

  .field-label {
    font-size: var(--text-xs, 0.75rem);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .required {
    color: #ef4444;
    margin-left: 2px;
  }

  .field-input,
  .field-select {
    padding: 0.4rem 0.6rem;
    font-size: var(--text-sm, 0.875rem);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm, 4px);
    background: var(--color-bg);
    color: var(--color-text);
    outline: none;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
    width: 100%;
    box-sizing: border-box;
  }

  .field-input:focus,
  .field-select:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 20%, transparent);
  }

  .field-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .field-readonly {
    font-size: var(--text-sm, 0.875rem);
    color: var(--color-text-secondary);
    padding: 0.4rem 0;
  }

  /* Tags */
  .tags-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm, 4px);
    background: var(--color-bg);
    min-height: 2.25rem;
    cursor: text;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
  }

  .tags-container:focus-within {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 20%, transparent);
  }

  .tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    background: var(--color-accent-bg);
    color: var(--color-accent);
    font-size: var(--text-xs, 0.75rem);
    font-weight: 500;
    white-space: nowrap;
  }

  .tag-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    font-size: 0.9rem;
    line-height: 1;
    opacity: 0.7;
    transition: opacity 0.1s ease;
  }

  .tag-remove:hover {
    opacity: 1;
  }

  .tag-input {
    flex: 1;
    min-width: 120px;
    border: none;
    outline: none;
    background: transparent;
    font-size: var(--text-sm, 0.875rem);
    color: var(--color-text);
    padding: 0.1rem 0;
  }

  .tag-input::placeholder {
    color: var(--color-text-muted);
  }

  @media (max-width: 600px) {
    .field-row {
      grid-template-columns: 1fr;
    }
  }
</style>
