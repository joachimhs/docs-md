<script lang="ts">
  let {
    mode,
    showPreview,
    isDirty,
    gitAhead = 0,
    hasRemote = false,
    onModeChange,
    onPreviewToggle,
    onSave,
    onCommit,
    onPush,
    docPath,
  }: {
    mode: 'richtext' | 'markdown';
    showPreview: boolean;
    isDirty: boolean;
    gitAhead?: number;
    hasRemote?: boolean;
    onModeChange: (mode: 'richtext' | 'markdown') => void;
    onPreviewToggle: () => void;
    onSave: () => void;
    onCommit: () => void;
    onPush: () => void;
    docPath: string;
  } = $props();

  let historyHref = $derived(`/history/${docPath}`);
</script>

<div class="editor-toolbar">
  <div class="toolbar-left">
    <!-- Mode toggle -->
    <div class="mode-toggle" role="group" aria-label="Editor mode">
      <button
        class="mode-btn"
        class:active={mode === 'richtext'}
        onclick={() => onModeChange('richtext')}
        aria-pressed={mode === 'richtext'}
      >
        Rich Text
      </button>
      <button
        class="mode-btn"
        class:active={mode === 'markdown'}
        onclick={() => onModeChange('markdown')}
        aria-pressed={mode === 'markdown'}
      >
        Markdown
      </button>
    </div>

    <!-- Preview toggle only in markdown mode -->
    {#if mode === 'markdown'}
      <button
        class="toolbar-btn preview-btn"
        class:active={showPreview}
        onclick={onPreviewToggle}
        aria-pressed={showPreview}
        title="Toggle preview"
      >
        Preview
      </button>
    {/if}
  </div>

  <div class="toolbar-right">
    <button
      class="toolbar-btn save-btn"
      class:dirty={isDirty}
      onclick={onSave}
      disabled={!isDirty}
      title={isDirty ? 'Save changes (Ctrl+S)' : 'No unsaved changes'}
    >
      Save
    </button>

    <button
      class="toolbar-btn commit-btn"
      onclick={onCommit}
      title="Commit to git"
    >
      Commit
    </button>

    {#if hasRemote}
      <button
        class="toolbar-btn push-btn"
        onclick={onPush}
        disabled={gitAhead === 0}
        title={gitAhead > 0 ? `Push ${gitAhead} commit(s)` : 'Nothing to push'}
      >
        {#if gitAhead > 0}
          Push ({gitAhead})
        {:else}
          Push
        {/if}
      </button>
    {/if}

    <div class="toolbar-divider" aria-hidden="true"></div>

    <a
      class="toolbar-btn history-link"
      href={historyHref}
      title="View document history"
    >
      History
    </a>
  </div>
</div>

<style>
  .editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
    gap: var(--spacing-md);
    flex-shrink: 0;
  }

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  /* Segmented mode toggle */
  .mode-toggle {
    display: inline-flex;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .mode-btn {
    padding: 0.25rem 0.65rem;
    font-size: var(--text-sm);
    font-weight: 500;
    border: none;
    background: var(--color-bg);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: background 0.1s ease, color 0.1s ease;
    white-space: nowrap;
  }

  .mode-btn:not(:last-child) {
    border-right: 1px solid var(--color-border);
  }

  .mode-btn:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .mode-btn.active {
    background: var(--color-accent);
    color: #fff;
  }

  /* Generic toolbar button */
  .toolbar-btn {
    padding: 0.25rem 0.65rem;
    font-size: var(--text-sm);
    font-weight: 500;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    color: var(--color-text-muted);
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    transition: background 0.1s ease, color 0.1s ease, border-color 0.1s ease;
    white-space: nowrap;
  }

  .toolbar-btn:hover:not(:disabled) {
    background: var(--color-bg-tertiary);
    color: var(--color-text);
    border-color: var(--color-text-muted);
  }

  .toolbar-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .toolbar-btn.active {
    background: var(--color-accent-bg);
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  /* Save button: highlighted when dirty */
  .save-btn.dirty {
    background: var(--color-accent);
    color: #fff;
    border-color: var(--color-accent);
  }

  .save-btn.dirty:hover {
    background: var(--color-accent-hover, var(--color-accent));
    border-color: var(--color-accent-hover, var(--color-accent));
    color: #fff;
  }

  /* Push button: highlighted when there are commits to push */
  .push-btn:not(:disabled) {
    color: var(--color-text);
  }

  .toolbar-divider {
    width: 1px;
    height: 1.25rem;
    background: var(--color-border);
    margin: 0 0.2rem;
    flex-shrink: 0;
  }
</style>
