<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import 'diff2html/bundles/css/diff2html.min.css';

  let docPath = $derived($page.params.path + '.md');
  let fromHash = $derived($page.url.searchParams.get('from') || '');
  let toHash = $derived($page.url.searchParams.get('to') || '');

  let diffHtml = $state('');
  let loading = $state(true);
  let error = $state('');
  let outputFormat = $state<'line-by-line' | 'side-by-side'>('side-by-side');

  async function loadDiff() {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams({ path: docPath, from: fromHash });
      if (toHash) params.set('to', toHash);

      const res = await fetch(`/api/git/diff?${params}`);
      if (!res.ok) throw new Error('Failed to load diff');
      const data = await res.json() as { diff: string };

      // Render with diff2html
      const { html: renderDiff } = await import('diff2html');
      diffHtml = renderDiff(data.diff, {
        drawFileList: false,
        outputFormat,
        matching: 'lines',
      });
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Unknown error';
    }
    loading = false;
  }

  onMount(loadDiff);

  // Re-render when format changes — track only outputFormat, not loading
  let prevFormat = $state(outputFormat);
  $effect(() => {
    if (outputFormat !== prevFormat) {
      prevFormat = outputFormat;
      loadDiff();
    }
  });

  let historyPath = $derived($page.params.path);
</script>

<div class="diff-page">
  <div class="page-header">
    <a href="/history/{historyPath}" class="back-link">&larr; Back to history</a>
    <div class="header-main">
      <h1 class="page-title">Diff: <span class="doc-path">{docPath}</span></h1>
      <p class="diff-range">
        Comparing
        <code class="hash">{fromHash || '—'}</code>
        &rarr;
        <code class="hash">{toHash || 'parent'}</code>
      </p>
    </div>

    <div class="format-toggle" role="group" aria-label="Diff format">
      <button
        class="toggle-btn"
        class:active={outputFormat === 'line-by-line'}
        onclick={() => { outputFormat = 'line-by-line'; }}
        type="button"
      >
        Unified
      </button>
      <button
        class="toggle-btn"
        class:active={outputFormat === 'side-by-side'}
        onclick={() => { outputFormat = 'side-by-side'; }}
        type="button"
      >
        Side by Side
      </button>
    </div>
  </div>

  {#if loading}
    <div class="state-message loading">Loading diff…</div>
  {:else if error}
    <div class="state-message error" role="alert">
      <strong>Error:</strong> {error}
    </div>
  {:else if !diffHtml}
    <div class="state-message empty">No changes found for this commit.</div>
  {:else}
    <div class="diff-container">
      {@html diffHtml}
    </div>
  {/if}
</div>

<style>
  .diff-page {
    padding: var(--spacing-xl) var(--spacing-md);
    max-width: 100%;
    overflow-x: auto;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xl);
    max-width: 900px;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color 0.12s ease;
    width: fit-content;
  }

  .back-link:hover {
    color: var(--color-accent);
  }

  .header-main {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .page-title {
    font-family: var(--font-heading);
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .doc-path {
    font-family: var(--font-mono);
    font-size: var(--text-xl);
    font-weight: 400;
    color: var(--color-text-secondary);
  }

  .diff-range {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  .hash {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-sm);
  }

  /* Format toggle */
  .format-toggle {
    display: inline-flex;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    width: fit-content;
  }

  .toggle-btn {
    padding: 0.3rem 0.75rem;
    font-size: var(--text-sm);
    font-weight: 500;
    background: var(--color-bg);
    color: var(--color-text-secondary);
    border: none;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }

  .toggle-btn:not(:last-child) {
    border-right: 1px solid var(--color-border);
  }

  .toggle-btn.active {
    background: var(--color-accent);
    color: #fff;
  }

  .toggle-btn:not(.active):hover {
    background: var(--color-bg-secondary);
    color: var(--color-text);
  }

  /* State messages */
  .state-message {
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    font-size: var(--text-base);
    max-width: 600px;
  }

  .state-message.loading {
    color: var(--color-text-muted);
    background: var(--color-bg-secondary);
  }

  .state-message.error {
    color: var(--color-danger);
    background: #fef2f2;
    border: 1px solid #fecaca;
  }

  .state-message.empty {
    color: var(--color-text-muted);
    background: var(--color-bg-secondary);
    text-align: center;
  }

  /* diff2html container */
  .diff-container {
    overflow-x: auto;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
  }

  /* Override some diff2html styles for better integration */
  .diff-container :global(.d2h-wrapper) {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }

  .diff-container :global(.d2h-file-header) {
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
  }

  @media (max-width: 768px) {
    .diff-page {
      padding: var(--spacing-md);
    }

    .format-toggle {
      width: 100%;
    }

    .toggle-btn {
      flex: 1;
      text-align: center;
    }
  }
</style>
