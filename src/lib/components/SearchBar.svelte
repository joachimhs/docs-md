<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { SearchResult } from '$lib/types';

  let query = $state('');
  let results = $state<SearchResult[]>([]);
  let showDropdown = $state(false);
  let inputEl = $state<HTMLInputElement | null>(null);
  let containerEl = $state<HTMLDivElement | null>(null);
  let fetchTimer: ReturnType<typeof setTimeout> | null = null;

  async function fetchPreview(q: string) {
    if (!q.trim()) {
      results = [];
      showDropdown = false;
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      results = data.results ?? [];
      showDropdown = results.length > 0;
    } catch {
      results = [];
      showDropdown = false;
    }
  }

  function handleInput() {
    if (fetchTimer) clearTimeout(fetchTimer);
    fetchTimer = setTimeout(() => fetchPreview(query), 200);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && query.trim()) {
      showDropdown = false;
      goto(`/search?q=${encodeURIComponent(query.trim())}`);
    }
    if (e.key === 'Escape') {
      showDropdown = false;
    }
  }

  function selectResult(path: string) {
    showDropdown = false;
    goto(`/doc/${path}`);
  }

  function handleClickOutside(e: MouseEvent) {
    if (containerEl && !containerEl.contains(e.target as Node)) {
      showDropdown = false;
    }
  }

  export function focusInput() {
    inputEl?.focus();
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });
</script>

<div class="searchbar-container" bind:this={containerEl}>
  <input
    bind:this={inputEl}
    bind:value={query}
    oninput={handleInput}
    onkeydown={handleKeydown}
    type="search"
    placeholder="Search docs… (Ctrl+K)"
    class="searchbar-input"
    autocomplete="off"
  />

  {#if showDropdown && results.length > 0}
    <ul class="searchbar-dropdown" role="listbox">
      {#each results as result}
        <li role="option" aria-selected="false">
          <button
            class="dropdown-item"
            onclick={() => selectResult(result.path)}
            type="button"
          >
            <span class="dropdown-title">{result.title}</span>
            <span class="dropdown-type">{result.type}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .searchbar-container {
    position: relative;
    width: 100%;
  }

  .searchbar-input {
    width: 100%;
    padding: 0.375rem 0.75rem;
    font-size: var(--text-sm);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg-secondary);
    color: var(--color-text);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  .searchbar-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .searchbar-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    list-style: none;
    margin: 0;
    padding: var(--spacing-xs) 0;
    z-index: 200;
    max-height: 320px;
    overflow-y: auto;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--spacing-xs) var(--spacing-md);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text);
    text-align: left;
    gap: var(--spacing-sm);
    font-size: var(--text-sm);
    transition: background 0.1s;
  }

  .dropdown-item:hover {
    background: var(--color-bg-secondary);
  }

  .dropdown-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }

  .dropdown-type {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    flex-shrink: 0;
    background: var(--color-bg-secondary);
    padding: 0.1em 0.4em;
    border-radius: 3px;
  }
</style>
