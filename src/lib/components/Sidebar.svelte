<script lang="ts">
  import type { ManifestEntry, DocsMDConfig } from '$lib/types';
  import { gitState } from '$lib/stores/git.svelte';

  let { manifest, config, activePath, onLinkClick }: {
    manifest: ManifestEntry[];
    config: DocsMDConfig | null;
    activePath: string | null;
    onLinkClick?: () => void;
  } = $props();

  // Group docs by type
  let byType = $derived(
    manifest.reduce((acc, doc) => {
      (acc[doc.type] ??= []).push(doc);
      return acc;
    }, {} as Record<string, ManifestEntry[]>)
  );

  let types = $derived(Object.keys(byType).sort());

  // Track which groups are expanded
  let expanded = $state<Record<string, boolean>>({});

  // Initialize all groups as expanded when types change
  $effect(() => {
    for (const type of types) {
      if (!(type in expanded)) {
        expanded[type] = true;
      }
    }
  });

  function toggleGroup(type: string) {
    expanded[type] = !expanded[type];
  }

  function docUrl(path: string): string {
    return '/doc/' + path.replace(/\.md$/, '');
  }

  function getTypeLabel(type: string): string {
    return config?.types[type]?.label || type.charAt(0).toUpperCase() + type.slice(1);
  }

  function getTypeIcon(type: string): string {
    return type.toUpperCase().slice(0, 3);
  }
</script>

<nav class="sidebar-nav">
  {#each types as type (type)}
    {@const docs = byType[type]}
    {@const isExpanded = expanded[type] ?? true}
    <div class="type-group">
      <button
        class="type-header"
        onclick={() => toggleGroup(type)}
        aria-expanded={isExpanded}
      >
        <span class="type-icon">[{getTypeIcon(type)}]</span>
        <span class="type-label">{getTypeLabel(type)}</span>
        <span class="type-count">({docs.length})</span>
        <span class="chevron" class:rotated={!isExpanded}>▾</span>
      </button>

      {#if isExpanded}
        <ul class="doc-list">
          {#each docs as doc (doc.path)}
            {@const isActive = activePath === doc.path}
            <li>
              <a
                href={docUrl(doc.path)}
                class="doc-link"
                class:active={isActive}
                title={doc.title}
                onclick={onLinkClick}
              >
                {doc.title}{#if gitState.isModified(doc.path)}<span class="modified-dot" title="Modified"></span>{/if}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/each}

  {#if types.length === 0}
    <p class="empty-state">No documents found.</p>
  {/if}
</nav>

<style>
  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: var(--text-sm);
  }

  .type-group {
    display: flex;
    flex-direction: column;
  }

  .type-header {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
    padding: 0.4rem 0.5rem;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--color-text);
    text-align: left;
    font-size: var(--text-sm);
    font-weight: 600;
    transition: background 0.15s ease;
  }

  .type-header:hover {
    background: var(--color-bg-tertiary);
  }

  .type-icon {
    font-size: var(--text-xs);
    color: var(--color-accent);
    font-weight: 700;
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  .type-label {
    flex: 1;
  }

  .type-count {
    color: var(--color-text-muted);
    font-weight: 400;
    font-size: var(--text-xs);
  }

  .chevron {
    color: var(--color-text-muted);
    font-size: 0.8rem;
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .chevron.rotated {
    transform: rotate(-90deg);
  }

  .doc-list {
    list-style: none;
    margin: 0;
    padding: 0;
    padding-left: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
  }

  .doc-link {
    display: block;
    padding: 0.3rem 0.5rem;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: var(--text-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.12s ease, color 0.12s ease;
    border-left: 2px solid transparent;
  }

  .doc-link:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .doc-link.active {
    background: var(--color-accent-bg);
    color: var(--color-accent);
    font-weight: 600;
    border-left-color: var(--color-accent);
  }

  .empty-state {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    padding: 0.5rem;
  }

  .modified-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #f97316;
    margin-left: 5px;
    vertical-align: middle;
    flex-shrink: 0;
  }
</style>
