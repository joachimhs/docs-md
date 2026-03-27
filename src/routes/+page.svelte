<script lang="ts">
  import { goto } from '$app/navigation';
  import { docs } from '$lib/stores/docs.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  let quickSearch = $state('');

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && quickSearch.trim()) {
      goto(`/search?q=${encodeURIComponent(quickSearch.trim())}`);
    }
  }

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

  const totalDocs = $derived(docs.manifest?.length ?? 0);
  const totalTypes = $derived(docs.types?.length ?? 0);
</script>

<div class="landing">
  <section class="hero">
    <h1 class="project-name">{docs.config?.project.name || 'spec.md'}</h1>
    {#if docs.config?.project.description}
      <p class="project-description">{docs.config.project.description}</p>
    {/if}
    <p class="summary">{totalDocs} documents across {totalTypes} types</p>

    <div class="quick-search">
      <input
        type="search"
        bind:value={quickSearch}
        onkeydown={handleSearchKeydown}
        placeholder="Quick search… press Enter to search"
        class="quick-search-input"
      />
    </div>
  </section>

  {#if Object.keys(docs.byType).length > 0}
    <section class="types-section">
      <h2 class="section-title">Document Types</h2>
      <div class="type-grid">
        {#each Object.entries(docs.byType) as [type, typeDocs]}
          {@const typeConfig = docs.config?.types?.[type]}
          <a href="/search?type={type}" class="type-card">
            <div class="type-icon">{typeConfig?.icon || '📄'}</div>
            <div class="type-info">
              <span class="type-label">{typeConfig?.label || type}</span>
              <span class="type-count">{typeDocs.length} {typeDocs.length === 1 ? 'document' : 'documents'}</span>
            </div>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  {#if docs.recentDocs.length > 0}
    <section class="recent-section">
      <h2 class="section-title">Recently Updated</h2>
      <ul class="recent-list">
        {#each docs.recentDocs as doc}
          <li class="recent-item">
            <a href="/doc/{doc.path}" class="recent-title">{doc.title}</a>
            <div class="recent-meta">
              <StatusBadge status={doc.type} type={doc.type} />
              {#if doc.updated}
                <span class="recent-date">{formatDate(doc.updated)}</span>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

<style>
  .landing {
    max-width: 960px;
    margin: 0 auto;
    padding: var(--spacing-xl) var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }

  .hero {
    text-align: center;
    padding: var(--spacing-xl) 0;
  }

  .project-name {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 var(--spacing-sm);
    color: var(--color-text);
  }

  .project-description {
    font-size: var(--text-lg);
    color: var(--color-text-muted);
    margin: 0 0 var(--spacing-sm);
  }

  .summary {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-lg);
  }

  .quick-search {
    max-width: 500px;
    margin: 0 auto;
  }

  .quick-search-input {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--text-base);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    color: var(--color-text);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  .quick-search-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .section-title {
    font-size: var(--text-lg);
    font-weight: 700;
    margin: 0 0 var(--spacing-md);
    color: var(--color-text);
  }

  .type-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }

  @media (min-width: 480px) {
    .type-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (min-width: 720px) {
    .type-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .type-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    text-decoration: none;
    color: var(--color-text);
    transition: box-shadow 0.15s, border-color 0.15s, transform 0.1s;
  }

  .type-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: var(--color-primary);
    transform: translateY(-1px);
  }

  .type-icon {
    font-size: 1.75rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .type-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .type-label {
    font-weight: 600;
    font-size: var(--text-sm);
    text-transform: capitalize;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .type-count {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-top: 2px;
  }

  .recent-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .recent-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: 6px;
    transition: background 0.1s;
  }

  .recent-item:hover {
    background: var(--color-bg-secondary);
  }

  .recent-title {
    color: var(--color-text);
    text-decoration: none;
    font-size: var(--text-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
  }

  .recent-title:hover {
    color: var(--color-primary);
    text-decoration: underline;
  }

  .recent-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-shrink: 0;
  }

  .recent-date {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    white-space: nowrap;
  }
</style>
