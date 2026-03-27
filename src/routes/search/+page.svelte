<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { search } from '$lib/stores/search.svelte';
  import SearchResults from '$lib/components/SearchResults.svelte';
  import SearchFacets from '$lib/components/SearchFacets.svelte';

  let searchInput = $state<HTMLInputElement | null>(null);

  // Read initial URL params
  const initialQuery = $derived($page.url.searchParams.get('q') || '');
  const initialType = $derived($page.url.searchParams.get('type') || '');
  const initialStatus = $derived($page.url.searchParams.get('status') || '');

  let localQuery = $state('');

  onMount(() => {
    localQuery = initialQuery;

    // Apply URL filters
    if (initialType) {
      search.filters.type = initialType;
    }
    if (initialStatus) {
      search.filters.status = initialStatus;
    }

    // Trigger initial search from URL query
    if (localQuery) {
      search.setQuery(localQuery);
    }

    // Auto-focus
    searchInput?.focus();
  });

  function handleInput() {
    const q = localQuery.trim();
    // Update URL without reload
    const url = new URL(window.location.href);
    if (q) {
      url.searchParams.set('q', q);
    } else {
      url.searchParams.delete('q');
    }
    goto(url.toString(), { replaceState: true, noScroll: true });
    search.setQuery(localQuery);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      localQuery = '';
      handleInput();
    }
  }
</script>

<svelte:head>
  <title>Search {localQuery ? `— ${localQuery}` : ''} | {$page.data?.config?.project?.name || 'docs.md'}</title>
</svelte:head>

<div class="search-page">
  <div class="search-header">
    <input
      bind:this={searchInput}
      bind:value={localQuery}
      oninput={handleInput}
      onkeydown={handleKeydown}
      type="search"
      placeholder="Search documents…"
      class="search-input"
    />
    {#if search.total > 0 && localQuery.trim()}
      <p class="result-count">{search.total} result{search.total !== 1 ? 's' : ''} for '<strong>{localQuery}</strong>'</p>
    {/if}
  </div>

  <div class="search-body">
    <SearchFacets
      facets={search.facets}
      activeFilters={search.filters}
      onTypeToggle={(type) => search.toggleTypeFilter(type)}
      onStatusToggle={(status) => search.toggleStatusFilter(status)}
      onTagToggle={(tag) => search.toggleTagFilter(tag)}
      onClear={() => search.clearFilters()}
    />

    <SearchResults
      results={search.results}
      loading={search.loading}
      query={localQuery}
    />
  </div>
</div>

<style>
  .search-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: var(--spacing-xl) var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .search-header {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .search-input {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--text-lg);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    color: var(--color-text);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  .search-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .result-count {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  .result-count strong {
    color: var(--color-text);
  }

  .search-body {
    display: flex;
    gap: var(--spacing-xl);
    align-items: flex-start;
  }

  @media (max-width: 768px) {
    .search-body {
      flex-direction: column;
    }

    :global(.facets) {
      width: 100% !important;
    }
  }
</style>
