<script lang="ts">
  import { docs } from '$lib/stores/docs.svelte';

  let { path, title, type }: { path: string; title: string; type: string } = $props();

  let typeLabel = $derived(docs.config?.types[type]?.plural || type);
</script>

<nav class="breadcrumb">
  <a href="/">Home</a>
  <span class="sep">/</span>
  <a href="/search?type={type}">{typeLabel}</a>
  <span class="sep">/</span>
  <span class="current">{title}</span>
</nav>

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-md);
  }

  .breadcrumb a {
    color: var(--color-accent);
    text-decoration: none;
  }

  .breadcrumb a:hover {
    text-decoration: underline;
  }

  .sep {
    color: var(--color-text-muted);
  }

  .current {
    color: var(--color-text);
  }
</style>
