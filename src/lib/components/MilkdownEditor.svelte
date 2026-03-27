<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let { content, readonly = false, onchange }: {
    content: string;
    readonly?: boolean;
    onchange: (markdown: string) => void;
  } = $props();

  let editorEl: HTMLDivElement = $state() as HTMLDivElement;
  let mounted = $state(false);

  // Keep a reference to the Crepe instance so we can update content externally
  // and destroy on cleanup.
  let crepeInstance: import('@milkdown/crepe').Crepe | undefined;

  // Track the last markdown value we pushed into the editor so we can avoid
  // feedback loops in the $effect below.
  let lastPushedContent = $state('');

  async function uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/assets', { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.path as string;
  }

  onMount(() => {
    // Kick off async init without returning the promise to onMount,
    // so the type signature (sync cleanup fn | void) is satisfied.
    (async () => {
      mounted = true;

      // Dynamic imports keep all of this out of the SSR bundle.
      const { Crepe } = await import('@milkdown/crepe');

      lastPushedContent = content;

      const crepe = new Crepe({
        root: editorEl,
        defaultValue: content,
        featureConfigs: {
          [Crepe.Feature.ImageBlock]: {
            // Handle inline uploads
            inlineOnUpload: uploadImage,
            // Handle block uploads
            blockOnUpload: uploadImage,
            // Shared fallback
            onUpload: uploadImage,
          },
          [Crepe.Feature.Placeholder]: {
            text: 'Start writing…',
          },
        },
      });

      // Listen for markdown changes
      crepe.on((listener) => {
        listener.markdownUpdated((_ctx, markdown, _prev) => {
          onchange(markdown);
        });
      });

      // Apply readonly state
      if (readonly) {
        crepe.setReadonly(true);
      }

      await crepe.create();
      crepeInstance = crepe;
    })().catch(console.error);
  });

  onDestroy(() => {
    crepeInstance?.destroy().catch(console.error);
    crepeInstance = undefined;
  });

  // Sync external `content` prop into the editor without causing feedback loops.
  // We use `getMarkdown` + `replaceAll` via the Crepe helper which exposes
  // the underlying ProseMirror action API synchronously.
  $effect(() => {
    const nextContent = content;
    if (!crepeInstance || nextContent === lastPushedContent) return;

    // Import and run replaceAll as a synchronous editor action.
    // We use a fire-and-forget dynamic import here since replaceAll itself
    // is synchronous once loaded.
    import('@milkdown/kit/utils').then(({ replaceAll }) => {
      crepeInstance!.editor.action(replaceAll(nextContent));
    }).catch(console.error);

    lastPushedContent = nextContent;
  });

  // Sync readonly prop
  $effect(() => {
    crepeInstance?.setReadonly(readonly);
  });
</script>

{#if mounted}
  <div class="milkdown-wrapper" bind:this={editorEl}></div>
{:else}
  <div class="editor-loading">Loading editor…</div>
{/if}

<style>
  /* Import the base Crepe theme via a global style in the component */
  :global(.milkdown) {
    /* Override Crepe CSS variables to match the app's theme */
    --crepe-color-background: var(--color-bg);
    --crepe-color-on-background: var(--color-text);
    --crepe-color-surface: var(--color-bg-secondary);
    --crepe-color-surface-low: var(--color-bg-tertiary);
    --crepe-color-on-surface: var(--color-text);
    --crepe-color-on-surface-variant: var(--color-text-secondary);
    --crepe-color-outline: var(--color-border);
    --crepe-color-primary: var(--color-accent);
    --crepe-color-secondary: var(--color-accent-bg);
    --crepe-color-on-secondary: var(--color-text);
    --crepe-color-hover: var(--color-bg-secondary);
    --crepe-color-selected: var(--color-bg-tertiary);

    --crepe-font-title: var(--font-heading);
    --crepe-font-default: var(--font-body);
    --crepe-font-code: var(--font-mono);
  }

  .milkdown-wrapper {
    height: 100%;
    width: 100%;
    overflow: auto;
    display: flex;
    flex-direction: column;
  }

  /* Ensure the milkdown editor occupies the full wrapper */
  .milkdown-wrapper :global(.milkdown) {
    height: 100%;
    width: 100%;
    max-width: 100%;
    background: var(--color-bg);
    color: var(--color-text);
  }

  /* Prose-like document feel */
  .milkdown-wrapper :global(.milkdown .ProseMirror) {
    min-height: 100%;
    padding: 2rem;
    font-family: var(--font-body);
    font-size: var(--text-base);
    line-height: 1.75;
    color: var(--color-text);
    outline: none;
  }

  /* Headings */
  .milkdown-wrapper :global(.milkdown .ProseMirror h1),
  .milkdown-wrapper :global(.milkdown .ProseMirror h2),
  .milkdown-wrapper :global(.milkdown .ProseMirror h3),
  .milkdown-wrapper :global(.milkdown .ProseMirror h4),
  .milkdown-wrapper :global(.milkdown .ProseMirror h5),
  .milkdown-wrapper :global(.milkdown .ProseMirror h6) {
    font-family: var(--font-heading);
    color: var(--color-text);
    line-height: 1.25;
    font-weight: 600;
  }

  .milkdown-wrapper :global(.milkdown .ProseMirror h1) { font-size: var(--text-4xl); margin: 0 0 var(--spacing-lg); }
  .milkdown-wrapper :global(.milkdown .ProseMirror h2) { font-size: var(--text-3xl); margin: var(--spacing-2xl) 0 var(--spacing-md); padding-bottom: var(--spacing-sm); border-bottom: 1px solid var(--color-border); }
  .milkdown-wrapper :global(.milkdown .ProseMirror h3) { font-size: var(--text-2xl); margin: var(--spacing-xl) 0 var(--spacing-sm); }
  .milkdown-wrapper :global(.milkdown .ProseMirror h4) { font-size: var(--text-xl); margin: var(--spacing-lg) 0 var(--spacing-sm); }

  /* Paragraphs */
  .milkdown-wrapper :global(.milkdown .ProseMirror p) {
    margin-bottom: var(--spacing-md);
  }

  /* Code */
  .milkdown-wrapper :global(.milkdown .ProseMirror code) {
    font-family: var(--font-mono);
    font-size: 0.875em;
    background: var(--color-bg-tertiary);
    color: var(--color-text);
    padding: 0.1em 0.35em;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
  }

  .milkdown-wrapper :global(.milkdown .ProseMirror pre) {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    overflow-x: auto;
    margin-bottom: var(--spacing-md);
  }

  .milkdown-wrapper :global(.milkdown .ProseMirror pre code) {
    background: none;
    border: none;
    padding: 0;
    font-size: inherit;
  }

  /* Crepe code block widget chrome (language selector, collapse, copy) */
  .milkdown-wrapper :global(.milkdown .code-block),
  .milkdown-wrapper :global(.milkdown [data-type="code_block"]),
  .milkdown-wrapper :global(.milkdown .crepe-code-block) {
    position: relative;
    margin-bottom: var(--spacing-md);
  }

  .milkdown-wrapper :global(.milkdown .code-block-header),
  .milkdown-wrapper :global(.milkdown .crepe-code-block-header) {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-md);
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-bottom: none;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .milkdown-wrapper :global(.milkdown .code-block-header + pre),
  .milkdown-wrapper :global(.milkdown .crepe-code-block-header + pre) {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    margin-top: 0;
  }

  /* Language selector in code blocks */
  .milkdown-wrapper :global(.milkdown .code-block-header select),
  .milkdown-wrapper :global(.milkdown .crepe-code-block select),
  .milkdown-wrapper :global(.milkdown select[data-language]) {
    appearance: none;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.15em 0.5em;
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    color: var(--color-text-secondary);
    cursor: pointer;
  }

  /* Collapse/expand and copy buttons in code blocks */
  .milkdown-wrapper :global(.milkdown .code-block-header button),
  .milkdown-wrapper :global(.milkdown .crepe-code-block button),
  .milkdown-wrapper :global(.milkdown .crepe-code-block-header button) {
    appearance: none;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.15em 0.5em;
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    cursor: pointer;
    line-height: 1.4;
  }

  .milkdown-wrapper :global(.milkdown .code-block-header button:hover),
  .milkdown-wrapper :global(.milkdown .crepe-code-block button:hover),
  .milkdown-wrapper :global(.milkdown .crepe-code-block-header button:hover) {
    background: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  /* Generic fallback: style any bare select/button that Crepe inserts near code */
  .milkdown-wrapper :global(.milkdown .ProseMirror div:has(> pre) > select),
  .milkdown-wrapper :global(.milkdown .ProseMirror div:has(> pre) > button) {
    appearance: none;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.15em 0.5em;
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    color: var(--color-text-secondary);
    cursor: pointer;
  }

  /* Blockquotes */
  .milkdown-wrapper :global(.milkdown .ProseMirror blockquote) {
    border-left: 4px solid var(--color-accent);
    background: var(--color-accent-bg);
    padding: var(--spacing-sm) var(--spacing-md);
    margin: var(--spacing-md) 0;
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  /* Lists */
  .milkdown-wrapper :global(.milkdown .ProseMirror ul),
  .milkdown-wrapper :global(.milkdown .ProseMirror ol) {
    padding-left: var(--spacing-xl);
    margin-bottom: var(--spacing-md);
  }

  .milkdown-wrapper :global(.milkdown .ProseMirror li) {
    margin-bottom: var(--spacing-xs);
  }

  /* Tables */
  .milkdown-wrapper :global(.milkdown .ProseMirror table) {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: var(--spacing-md);
    font-size: var(--text-sm);
  }

  .milkdown-wrapper :global(.milkdown .ProseMirror th),
  .milkdown-wrapper :global(.milkdown .ProseMirror td) {
    border: 1px solid var(--color-border);
    padding: var(--spacing-sm) var(--spacing-md);
    text-align: left;
  }

  .milkdown-wrapper :global(.milkdown .ProseMirror th) {
    background: var(--color-bg-secondary);
    font-weight: 600;
  }

  /* Images */
  .milkdown-wrapper :global(.milkdown .ProseMirror img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius-md);
    margin: var(--spacing-md) 0;
    display: block;
  }

  /* Horizontal rule */
  .milkdown-wrapper :global(.milkdown .ProseMirror hr) {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: var(--spacing-xl) 0;
  }

  /* Selection */
  .milkdown-wrapper :global(.milkdown .ProseMirror ::selection) {
    background: color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  /* Loading state */
  .editor-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    font-family: var(--font-body);
  }
</style>
