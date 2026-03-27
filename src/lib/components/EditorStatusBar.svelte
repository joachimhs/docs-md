<script lang="ts">
  let { body, isDirty, lastSavedAt }: {
    body: string;
    isDirty: boolean;
    lastSavedAt: string;
  } = $props();

  let wordCount = $derived(
    body
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]*`/g, '')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length
  );

  let savedLabel = $derived(
    isDirty ? 'Unsaved changes' : 'Saved'
  );
</script>

<div class="status-bar">
  <span class="status-words">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>

  <span class="status-divider" aria-hidden="true">·</span>

  <span class="status-save" class:dirty={isDirty}>
    {savedLabel}
  </span>

  {#if lastSavedAt && !isDirty}
    <span class="status-divider" aria-hidden="true">·</span>
    <span class="status-time">Saved at {lastSavedAt}</span>
  {/if}
</div>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.2rem 0.75rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
    font-size: var(--text-xs, 0.75rem);
    color: var(--color-text-muted);
    flex-shrink: 0;
    user-select: none;
  }

  .status-words {
    font-family: var(--font-mono);
    white-space: nowrap;
  }

  .status-divider {
    opacity: 0.5;
  }

  .status-save {
    white-space: nowrap;
  }

  .status-save.dirty {
    color: #f97316;
    font-weight: 500;
  }

  .status-time {
    white-space: nowrap;
    opacity: 0.8;
  }
</style>
