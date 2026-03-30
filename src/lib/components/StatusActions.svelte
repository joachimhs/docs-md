<script lang="ts">
  import type { DocFrontmatter, DocTypeConfig } from '$lib/types';

  let {
    frontmatter,
    typeConfig,
    docPath,
    onStatusChange,
  }: {
    frontmatter: DocFrontmatter;
    typeConfig: DocTypeConfig | undefined;
    docPath: string;
    onStatusChange: (newStatus: string) => void;
  } = $props();

  let updating = $state(false);

  // Get valid next statuses (all statuses for the type except the current one)
  const availableStatuses = $derived(
    (typeConfig?.statuses || []).filter(s => s !== frontmatter.status)
  );

  async function changeStatus(newStatus: string) {
    if (updating) return;
    updating = true;
    try {
      // Find the doc ID from the path
      const pathId = docPath.replace(/\.md$/, '').replace(/\//g, '-');
      // Try to find by scanning common ID patterns
      const res = await fetch(`/api/docs/${encodeURIComponent(pathId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontmatter: { status: newStatus } }),
      });
      if (!res.ok) {
        // Try with just the filename as ID
        const filename = docPath.split('/').pop()?.replace(/\.md$/, '') || '';
        const res2 = await fetch(`/api/docs/${encodeURIComponent(filename)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frontmatter: { status: newStatus } }),
        });
        if (!res2.ok) throw new Error('Failed to update status');
      }
      onStatusChange(newStatus);
    } catch (e: any) {
      window.alert(e.message || 'Failed to update status');
    } finally {
      updating = false;
    }
  }
</script>

{#if availableStatuses.length > 0}
  <div class="status-actions">
    <span class="status-label">Move to:</span>
    {#each availableStatuses as status}
      <button
        class="status-btn"
        disabled={updating}
        onclick={() => changeStatus(status)}
      >
        {status}
      </button>
    {/each}
  </div>
{/if}

<style>
  .status-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
  }

  .status-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-weight: 600;
  }

  .status-btn {
    padding: 0.15rem 0.5rem;
    font-size: var(--text-xs);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    color: var(--color-text-secondary);
    cursor: pointer;
    text-transform: capitalize;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }

  .status-btn:hover:not(:disabled) {
    background: var(--color-accent-bg);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .status-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
