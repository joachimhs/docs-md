<script lang="ts">
  import { onMount } from 'svelte';

  let { code }: { code: string } = $props();
  let svg = $state('');
  let error = $state('');

  onMount(async () => {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
      securityLevel: 'strict',
    });
    try {
      const { svg: rendered } = await mermaid.render(
        `mermaid-${Math.random().toString(36).slice(2)}`,
        code,
      );
      svg = rendered;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to render diagram';
    }
  });
</script>

{#if error}
  <div class="mermaid-error">
    <pre>{code}</pre>
    <p class="mermaid-error-msg">{error}</p>
  </div>
{:else if svg}
  <div class="mermaid-diagram">{@html svg}</div>
{:else}
  <div class="mermaid-loading">Loading diagram...</div>
{/if}

<style>
  .mermaid-diagram {
    display: flex;
    justify-content: center;
    margin: var(--spacing-md) 0;
    overflow-x: auto;
  }
  .mermaid-diagram :global(svg) {
    max-width: 100%;
    height: auto;
  }
  .mermaid-error {
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin: var(--spacing-md) 0;
  }
  .mermaid-error-msg {
    color: var(--color-danger);
    font-size: var(--text-sm);
    margin: var(--spacing-xs) 0 0;
  }
  .mermaid-loading {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
</style>
