<script lang="ts">
  let { backlinks }: { backlinks: Array<{ id: string; title: string; path: string; type: string }> } = $props();
</script>

{#if backlinks.length > 0}
  <section class="backlinks">
    <h3 class="backlinks-heading">Referenced by</h3>
    <ul class="backlinks-list">
      {#each backlinks as link}
        <li>
          <a href="/doc/{link.path.replace(/\.md$/, '')}" class="backlink-item">
            <span class="backlink-type">{link.type}</span>
            <span class="backlink-title">{link.title}</span>
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .backlinks {
    margin-top: var(--spacing-xl);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--color-border);
  }

  .backlinks-heading {
    font-size: var(--text-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin: 0 0 var(--spacing-sm);
  }

  .backlinks-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .backlink-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    text-decoration: none;
    color: var(--color-text);
    font-size: var(--text-sm);
    transition: background 0.1s;
  }

  .backlink-item:hover {
    background: var(--color-bg-secondary);
  }

  .backlink-type {
    font-size: var(--text-xs);
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-sm);
    background: var(--color-bg-tertiary);
    color: var(--color-text-muted);
    text-transform: uppercase;
    font-weight: 600;
    flex-shrink: 0;
  }

  .backlink-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
