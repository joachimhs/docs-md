<script lang="ts">
  import type { SearchResponse, SearchFilters } from '$lib/types';

  let { facets, activeFilters, onTypeToggle, onStatusToggle, onTagToggle, onClear }: {
    facets: SearchResponse['facets'];
    activeFilters: SearchFilters;
    onTypeToggle: (type: string) => void;
    onStatusToggle: (status: string) => void;
    onTagToggle: (tag: string) => void;
    onClear: () => void;
  } = $props();

  const hasActiveFilters = $derived(
    !!(activeFilters.type || activeFilters.status || activeFilters.tags.length > 0)
  );

  const topTags = $derived(
    Object.entries(facets.tags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
  );
</script>

<aside class="facets">
  <div class="facets-header">
    <span class="facets-title">Filters</span>
    {#if hasActiveFilters}
      <button class="clear-link" onclick={onClear} type="button">Clear all</button>
    {/if}
  </div>

  {#if Object.keys(facets.type).length > 0}
    <div class="facet-group">
      <h3 class="facet-group-title">Type</h3>
      <ul class="facet-list">
        {#each Object.entries(facets.type) as [type, count]}
          <li class="facet-item">
            <label class="facet-label">
              <input
                type="checkbox"
                checked={activeFilters.type === type}
                onchange={() => onTypeToggle(type)}
                class="facet-checkbox"
              />
              <span class="facet-name">{type}</span>
              <span class="facet-count">{count}</span>
            </label>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if Object.keys(facets.status).length > 0}
    <div class="facet-group">
      <h3 class="facet-group-title">Status</h3>
      <ul class="facet-list">
        {#each Object.entries(facets.status) as [status, count]}
          <li class="facet-item">
            <label class="facet-label">
              <input
                type="checkbox"
                checked={activeFilters.status === status}
                onchange={() => onStatusToggle(status)}
                class="facet-checkbox"
              />
              <span class="facet-name">{status}</span>
              <span class="facet-count">{count}</span>
            </label>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if topTags.length > 0}
    <div class="facet-group">
      <h3 class="facet-group-title">Tags</h3>
      <ul class="facet-list">
        {#each topTags as [tag, count]}
          <li class="facet-item">
            <label class="facet-label">
              <input
                type="checkbox"
                checked={activeFilters.tags.includes(tag)}
                onchange={() => onTagToggle(tag)}
                class="facet-checkbox"
              />
              <span class="facet-name">{tag}</span>
              <span class="facet-count">{count}</span>
            </label>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</aside>

<style>
  .facets {
    width: 220px;
    flex-shrink: 0;
  }

  .facets-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-md);
  }

  .facets-title {
    font-weight: 700;
    font-size: var(--text-sm);
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .clear-link {
    background: none;
    border: none;
    cursor: pointer;
    font-size: var(--text-sm);
    color: var(--color-primary);
    padding: 0;
  }

  .clear-link:hover {
    text-decoration: underline;
  }

  .facet-group {
    margin-bottom: var(--spacing-md);
  }

  .facet-group-title {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-text-muted);
    margin: 0 0 var(--spacing-xs);
  }

  .facet-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .facet-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    padding: 3px 4px;
    border-radius: 4px;
    font-size: var(--text-sm);
    transition: background 0.1s;
  }

  .facet-label:hover {
    background: var(--color-bg-secondary);
  }

  .facet-checkbox {
    flex-shrink: 0;
    accent-color: var(--color-primary);
  }

  .facet-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text);
  }

  .facet-count {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    flex-shrink: 0;
    background: var(--color-bg-secondary);
    padding: 0.1em 0.4em;
    border-radius: 10px;
  }
</style>
