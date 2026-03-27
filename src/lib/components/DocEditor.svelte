<script lang="ts">
  import type { DocFrontmatter, DocsMDConfig } from '$lib/types';
  import { docs } from '$lib/stores/docs.svelte';
  import { gitState } from '$lib/stores/git.svelte';
  import FrontmatterForm from './FrontmatterForm.svelte';
  import CodeMirrorEditor from './CodeMirrorEditor.svelte';
  import MilkdownEditor from './MilkdownEditor.svelte';
  import MarkdownPreview from './MarkdownPreview.svelte';
  import EditorToolbar from './EditorToolbar.svelte';
  import EditorStatusBar from './EditorStatusBar.svelte';

  let {
    initialFrontmatter,
    initialBody,
    docPath,
    config,
    isNew = false,
  }: {
    initialFrontmatter: DocFrontmatter;
    initialBody: string;
    docPath: string;
    config: DocsMDConfig | null;
    isNew?: boolean;
  } = $props();

  let mode = $state<'richtext' | 'markdown'>(
    config?.ui?.default_editor ?? 'richtext'
  );
  let body = $state(initialBody);
  let frontmatter = $state<DocFrontmatter>({ ...initialFrontmatter });
  let lastSaved = $state(initialBody);
  let lastSavedFm = $state(JSON.stringify(initialFrontmatter));
  let isDirty = $derived(
    body !== lastSaved || JSON.stringify(frontmatter) !== lastSavedFm
  );
  let showPreview = $state(true);
  let saving = $state(false);
  let lastSavedAt = $state('');

  // Find the doc ID from the manifest (by path)
  function findDocId(): string | null {
    const entry = docs.manifest.find(
      (d) => d.path === docPath || d.path === docPath.replace(/^\//, '')
    );
    return entry?.id ?? null;
  }

  async function handleSave() {
    if (saving) return;
    saving = true;
    try {
      // Try to find existing doc in manifest; fall back to path-based ID
      const id = findDocId();
      const endpoint = id ? `/api/docs/${id}` : `/api/docs/${encodeURIComponent(docPath)}`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontmatter, body }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        console.error('Save failed:', err);
        return;
      }

      lastSaved = body;
      lastSavedFm = JSON.stringify(frontmatter);
      lastSavedAt = new Date().toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });

      // Refresh git state in the background
      gitState.refresh();
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      saving = false;
    }
  }

  async function handleCommit() {
    const defaultMsg = `docs(${frontmatter.type ?? 'doc'}): update — ${frontmatter.title}`;
    const message = window.prompt('Commit message:', defaultMsg);
    if (message === null) return; // cancelled

    const fullMessage = `[DOCS.MD] ${message || defaultMsg}`;

    try {
      const res = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fullMessage, files: [docPath] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Commit failed' }));
        console.error('Commit failed:', err);
      }
      await gitState.refresh();
    } catch (e) {
      console.error('Commit error:', e);
    }
  }

  async function handlePush() {
    try {
      const res = await fetch('/api/git/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Push failed' }));
        console.error('Push failed:', err);
      }
      await gitState.refresh();
    } catch (e) {
      console.error('Push error:', e);
    }
  }

  function handleFrontmatterChange(updated: Partial<DocFrontmatter>) {
    frontmatter = { ...frontmatter, ...updated };
  }

  function handleBodyChange(newBody: string) {
    body = newBody;
  }

  function handleModeChange(newMode: 'richtext' | 'markdown') {
    mode = newMode;
  }

  function handlePreviewToggle() {
    showPreview = !showPreview;
  }
</script>

<div class="doc-editor">
  <div class="doc-editor__meta">
    <FrontmatterForm
      {frontmatter}
      {config}
      onchange={handleFrontmatterChange}
      {isNew}
    />
  </div>

  <EditorToolbar
    {mode}
    {showPreview}
    {isDirty}
    gitAhead={gitState.ahead}
    hasRemote={gitState.hasRemote}
    onModeChange={handleModeChange}
    onPreviewToggle={handlePreviewToggle}
    onSave={handleSave}
    onCommit={handleCommit}
    onPush={handlePush}
    {docPath}
  />

  <div class="doc-editor__body">
    {#if mode === 'richtext'}
      <div class="editor-pane">
        <MilkdownEditor
          content={body}
          onchange={handleBodyChange}
        />
      </div>
    {:else}
      <div class="markdown-split">
        <div class="editor-pane">
          <CodeMirrorEditor
            content={body}
            onchange={handleBodyChange}
            onsave={handleSave}
          />
        </div>
        {#if showPreview}
          <div class="preview-pane">
            <MarkdownPreview markdown={body} />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <EditorStatusBar
    {body}
    {isDirty}
    {lastSavedAt}
  />
</div>

<style>
  .doc-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .doc-editor__meta {
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    flex-shrink: 0;
  }

  .doc-editor__body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .editor-pane {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .markdown-split {
    display: flex;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .markdown-split .editor-pane {
    flex: 1;
    border-right: 1px solid var(--color-border);
    min-width: 0;
  }

  .preview-pane {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
  }
</style>
