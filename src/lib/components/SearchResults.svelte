<script lang="ts">
  import type { SearchResult } from '$lib/types';
  import StatusBadge from './StatusBadge.svelte';

  let { results, loading, query }: {
    results: SearchResult[];
    loading: boolean;
    query: string;
  } = $props();

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
</script>

<div class="search-results">
  {#if loading}
    <p class="state-message">Searching…</p>
  {:else if results.length === 0 && query.trim()}
    <p class="state-message empty">No results found for '<strong>{query}</strong>'</p>
  {:else if results.length > 0}
    <ul class="results-list">
      {#each results as result}
        <li class="result-item">
          <div class="result-header">
            <a href="/doc/{result.path}" class="result-title">{result.title}</a>
            <div class="result-badges">
              <StatusBadge status={result.type} type={result.type} />
              <StatusBadge status={result.status} />
            </div>
          </div>

          {#if result.snippet}
            <p class="result-snippet">{@html result.snippet}</p>
          {/if}

          <div class="result-footer">
            {#if result.tags.length > 0}
              <div class="result-tags">
                {#each result.tags as tag}
                  <span class="tag-pill">{tag}</span>
                {/each}
              </div>
            {/if}
            {#if result.updated}
              <span class="result-date">{formatDate(result.updated)}</span>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .search-results {
    flex: 1;
    min-width: 0;
  }

  .state-message {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    padding: var(--spacing-lg) 0;
  }

  .state-message.empty strong {
    color: var(--color-text);
  }

  .results-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .result-item {
    padding: var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    transition: box-shadow 0.15s, border-color 0.15s;
  }

  .result-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border-color: var(--color-primary);
  }

  .result-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
  }

  .result-title {
    font-weight: 600;
    font-size: var(--text-base);
    color: var(--color-text);
    text-decoration: none;
    flex: 1;
    min-width: 0;
  }

  .result-title:hover {
    color: var(--color-primary);
    text-decoration: underline;
  }

  .result-badges {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .result-snippet {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0 0 var(--spacing-xs);
  }

  :global(.result-snippet mark) {
    background: color-mix(in srgb, var(--color-primary) 25%, transparent);
    color: inherit;
    border-radius: 2px;
    padding: 0 1px;
  }

  .result-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-xs);
  }

  .result-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag-pill {
    font-size: 0.7rem;
    padding: 0.1em 0.5em;
    border-radius: 10px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
  }

  .result-date {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    flex-shrink: 0;
    margin-left: auto;
  }
</style>
