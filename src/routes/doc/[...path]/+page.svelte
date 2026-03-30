<script lang="ts">
  import DocHeader from '$lib/components/DocHeader.svelte';
  import TableOfContents from '$lib/components/TableOfContents.svelte';
  import BreadcrumbNav from '$lib/components/BreadcrumbNav.svelte';
  import LoginPrompt from '$lib/components/LoginPrompt.svelte';
  import ProseContent from '$lib/components/ProseContent.svelte';
  import Backlinks from '$lib/components/Backlinks.svelte';
  import StatusActions from '$lib/components/StatusActions.svelte';
  import { docs } from '$lib/stores/docs.svelte';
  import { page } from '$app/stores';

  let { data } = $props();

  let showRaw = $state(false);

  function canEdit(): boolean {
    const layoutData = $page.data as any;
    if (!layoutData.authEnabled) return true;
    if (!layoutData.user) return false;
    return ['editor', 'admin'].includes(layoutData.user.role);
  }

  // Set active doc path in store so sidebar highlights the current doc
  $effect(() => {
    docs.activeDocPath = data.document.path;
  });

  // Get type config for status workflow
  const typeConfig = $derived(
    docs.config?.types?.[data.document.frontmatter.type || 'doc']
  );

  // Keyboard shortcuts
  $effect(() => {
    if (typeof window === 'undefined') return;

    function handleKeydown(e: KeyboardEvent) {
      // Ctrl+E / Cmd+E → Edit
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (canEdit()) {
          window.location.href = `/edit/${data.document.path.replace(/\.md$/, '')}`;
        }
      }
      // Ctrl+P / Cmd+P → Print (override browser default)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="doc-page">
  <div class="doc-content">
    <BreadcrumbNav
      path={data.document.path}
      title={data.document.frontmatter.title}
      type={data.document.frontmatter.type || 'doc'}
    />

    <DocHeader frontmatter={data.document.frontmatter} path={data.document.path} />

    <div class="doc-toolbar">
      {#if canEdit()}
        <a href="/edit/{data.document.path.replace(/\.md$/, '')}" class="toolbar-btn">Edit</a>
      {:else if ($page.data as any).authEnabled}
        <LoginPrompt action="edit" />
      {/if}
      <a href="/history/{data.document.path.replace(/\.md$/, '')}" class="toolbar-btn">History</a>
      <button
        class="toolbar-btn"
        class:active={showRaw}
        onclick={() => (showRaw = !showRaw)}
      >
        {showRaw ? 'Rendered' : 'Raw'}
      </button>
      <button class="toolbar-btn" onclick={() => window.print()} title="Print or save as PDF">
        Print
      </button>
      {#if canEdit()}
        <StatusActions
          frontmatter={data.document.frontmatter}
          typeConfig={typeConfig}
          docPath={data.document.path}
          onStatusChange={() => {
            // Refresh the page to show updated status
            window.location.reload();
          }}
        />
      {/if}
    </div>

    {#if showRaw}
      <pre class="raw-markdown">{data.document.body}</pre>
    {:else}
      <ProseContent html={data.document.html} />
    {/if}

    <Backlinks backlinks={data.backlinks} />
  </div>

  {#if data.document.headings.length > 0}
    <aside class="doc-toc">
      <TableOfContents headings={data.document.headings} />
    </aside>
  {/if}
</div>

<style>
  .doc-page {
    display: flex;
    gap: var(--spacing-xl);
    align-items: flex-start;
  }

  .doc-content {
    flex: 1;
    min-width: 0;
    max-width: var(--content-max-width);
  }

  .doc-toolbar {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
    align-items: center;
  }

  .toolbar-btn {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.75rem;
    font-size: var(--text-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    color: var(--color-text-secondary);
    cursor: pointer;
    text-decoration: none;
    transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
  }

  .toolbar-btn:hover:not(:disabled) {
    background: var(--color-bg-tertiary);
    color: var(--color-text);
    border-color: var(--color-text-muted);
  }

  .toolbar-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .toolbar-btn.active {
    background: var(--color-accent-bg);
    color: var(--color-accent);
    border-color: var(--color-accent);
    font-weight: 600;
  }

  .raw-markdown {
    background: var(--color-bg-secondary);
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 1.6;
    border: 1px solid var(--color-border);
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* Prose styles for rendered markdown */
  :global(.prose) {
    color: var(--color-text);
    line-height: 1.75;
    font-size: var(--text-base);
  }

  :global(.prose h1),
  :global(.prose h2),
  :global(.prose h3),
  :global(.prose h4),
  :global(.prose h5),
  :global(.prose h6) {
    font-family: var(--font-heading);
    color: var(--color-text);
    margin-top: var(--spacing-xl);
    margin-bottom: var(--spacing-sm);
    line-height: 1.3;
    scroll-margin-top: calc(var(--header-height) + 1rem);
  }

  :global(.prose h1) { font-size: var(--text-3xl); font-weight: 700; }
  :global(.prose h2) { font-size: var(--text-2xl); font-weight: 700; border-bottom: 1px solid var(--color-border); padding-bottom: 0.3em; }
  :global(.prose h3) { font-size: var(--text-xl); font-weight: 600; }
  :global(.prose h4) { font-size: var(--text-lg); font-weight: 600; }

  :global(.prose p) {
    margin: 0 0 var(--spacing-md) 0;
  }

  :global(.prose a) {
    color: var(--color-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  :global(.prose a:hover) {
    color: var(--color-accent-hover);
  }

  :global(.prose ul),
  :global(.prose ol) {
    padding-left: 1.5em;
    margin-bottom: var(--spacing-md);
  }

  :global(.prose li) {
    margin-bottom: 0.3em;
  }

  :global(.prose code) {
    font-family: var(--font-mono);
    font-size: 0.875em;
    background: var(--color-bg-secondary);
    padding: 0.15em 0.4em;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-light);
  }

  :global(.prose pre) {
    background: var(--color-bg-secondary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin-bottom: var(--spacing-md);
    border: 1px solid var(--color-border);
  }

  :global(.prose pre code) {
    background: none;
    border: none;
    padding: 0;
    font-size: var(--text-sm);
  }

  :global(.prose blockquote) {
    border-left: 3px solid var(--color-accent);
    padding-left: var(--spacing-md);
    margin-left: 0;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  :global(.prose table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: var(--spacing-md);
    font-size: var(--text-sm);
  }

  :global(.prose th),
  :global(.prose td) {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    text-align: left;
  }

  :global(.prose th) {
    background: var(--color-bg-secondary);
    font-weight: 600;
  }

  :global(.prose hr) {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: var(--spacing-xl) 0;
  }

  /* TOC sidebar */
  .doc-toc {
    width: 200px;
    flex-shrink: 0;
    position: sticky;
    top: calc(var(--header-height) + var(--spacing-xl));
    max-height: calc(100vh - var(--header-height) - 2 * var(--spacing-xl));
    overflow-y: auto;
    display: none;
  }

  @media (min-width: 1200px) {
    .doc-toc {
      display: block;
    }
  }
</style>
