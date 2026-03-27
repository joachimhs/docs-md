<script lang="ts">
  let { markdown }: { markdown: string } = $props();

  let html = $state('');
  let loading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const md = markdown;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      loading = true;
      try {
        const res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markdown: md }),
        });
        if (res.ok) {
          const data = await res.json();
          html = data.html ?? '';
        }
      } catch {
        // silently ignore preview errors
      } finally {
        loading = false;
      }
    }, 200);

    return () => {
      clearTimeout(debounceTimer);
    };
  });
</script>

<div class="preview-wrapper">
  {#if loading}
    <div class="preview-loading">Loading preview...</div>
  {:else}
    <div class="prose">{@html html}</div>
  {/if}
</div>

<style>
  .preview-wrapper {
    height: 100%;
    overflow-y: auto;
    padding: 1.5rem 2rem;
    background: var(--color-bg);
  }

  .preview-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    font-style: italic;
  }

  .prose {
    max-width: 72ch;
    font-family: var(--font-body);
    font-size: var(--text-base);
    line-height: 1.75;
    color: var(--color-text);
  }

  .prose :global(h1),
  .prose :global(h2),
  .prose :global(h3),
  .prose :global(h4),
  .prose :global(h5),
  .prose :global(h6) {
    font-family: var(--font-heading);
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.25;
  }

  .prose :global(h1) { font-size: var(--text-4xl); margin: 0 0 var(--spacing-lg); }
  .prose :global(h2) { font-size: var(--text-3xl); margin: var(--spacing-2xl) 0 var(--spacing-md); padding-bottom: var(--spacing-sm); border-bottom: 1px solid var(--color-border); }
  .prose :global(h3) { font-size: var(--text-2xl); margin: var(--spacing-xl) 0 var(--spacing-sm); }
  .prose :global(h4) { font-size: var(--text-xl); margin: var(--spacing-lg) 0 var(--spacing-sm); }

  .prose :global(p) { margin-bottom: var(--spacing-md); }

  .prose :global(a) {
    color: var(--color-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .prose :global(code) {
    font-family: var(--font-mono);
    font-size: 0.875em;
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    padding: 0.1em 0.35em;
    border-radius: var(--radius-sm);
  }

  .prose :global(pre) {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    overflow-x: auto;
    margin-bottom: var(--spacing-md);
  }

  .prose :global(pre code) {
    background: none;
    border: none;
    padding: 0;
    font-size: var(--text-sm);
  }

  .prose :global(blockquote) {
    border-left: 4px solid var(--color-accent);
    background: var(--color-accent-bg);
    padding: var(--spacing-sm) var(--spacing-md);
    margin: var(--spacing-md) 0;
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .prose :global(ul),
  .prose :global(ol) {
    padding-left: var(--spacing-xl);
    margin-bottom: var(--spacing-md);
  }

  .prose :global(li) { margin-bottom: var(--spacing-xs); }

  .prose :global(table) {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: var(--spacing-md);
    font-size: var(--text-sm);
  }

  .prose :global(th),
  .prose :global(td) {
    border: 1px solid var(--color-border);
    padding: var(--spacing-sm) var(--spacing-md);
    text-align: left;
  }

  .prose :global(th) {
    background: var(--color-bg-secondary);
    font-weight: 600;
  }

  .prose :global(hr) {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: var(--spacing-xl) 0;
  }

  .prose :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius-md);
    margin: var(--spacing-md) 0;
    display: block;
  }
</style>
