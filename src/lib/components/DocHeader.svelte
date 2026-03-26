<script lang="ts">
  import type { DocFrontmatter } from '$lib/types';
  import StatusBadge from './StatusBadge.svelte';

  let { frontmatter, path }: { frontmatter: DocFrontmatter; path: string } = $props();

  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
</script>

<header class="doc-header">
  <h1 class="doc-title">{frontmatter.title}</h1>

  <div class="doc-badges">
    {#if frontmatter.type}
      <StatusBadge status={frontmatter.type} type={frontmatter.type} />
    {/if}
    {#if frontmatter.status}
      <StatusBadge status={frontmatter.status} />
    {/if}
  </div>

  <div class="doc-meta">
    {#if frontmatter.owner}
      <span class="meta-item">
        <span class="meta-label">Owner:</span>
        <span class="meta-value">{frontmatter.owner}</span>
      </span>
    {/if}
    {#if frontmatter.created}
      <span class="meta-item">
        <span class="meta-label">Created:</span>
        <span class="meta-value">{formatDate(frontmatter.created)}</span>
      </span>
    {/if}
    {#if frontmatter.updated}
      <span class="meta-item">
        <span class="meta-label">Updated:</span>
        <span class="meta-value">{formatDate(frontmatter.updated)}</span>
      </span>
    {/if}
  </div>

  {#if frontmatter.tags && frontmatter.tags.length > 0}
    <div class="doc-tags">
      {#each frontmatter.tags as tag (tag)}
        <a href="/search?tag={encodeURIComponent(tag)}" class="tag-pill">{tag}</a>
      {/each}
    </div>
  {/if}
</header>

<style>
  .doc-header {
    margin-bottom: var(--spacing-xl);
    padding-bottom: var(--spacing-lg);
    border-bottom: 1px solid var(--color-border);
  }

  .doc-title {
    font-family: var(--font-heading);
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 var(--spacing-md) 0;
    line-height: 1.25;
  }

  .doc-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: var(--spacing-sm);
  }

  .doc-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-sm);
  }

  .meta-item {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }

  .meta-label {
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .meta-value {
    color: var(--color-text-secondary);
  }

  .doc-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: var(--spacing-sm);
  }

  .tag-pill {
    display: inline-block;
    padding: 0.15em 0.6em;
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    border-radius: 999px;
    font-size: var(--text-xs);
    font-weight: 500;
    text-decoration: none;
    transition: background 0.12s ease, color 0.12s ease;
  }

  .tag-pill:hover {
    background: var(--color-accent-bg);
    color: var(--color-accent);
  }
</style>
