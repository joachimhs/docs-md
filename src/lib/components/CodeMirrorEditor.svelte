<script lang="ts">
  import { onMount } from 'svelte';
  import { EditorView, keymap, lineNumbers } from '@codemirror/view';
  import { EditorState } from '@codemirror/state';
  import { markdown } from '@codemirror/lang-markdown';
  import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
  import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language';
  import { searchKeymap } from '@codemirror/search';

  let { content, readonly = false, onchange, onsave }: {
    content: string;
    readonly?: boolean;
    onchange: (markdown: string) => void;
    onsave?: () => void;
  } = $props();

  let editorEl: HTMLDivElement;
  let view: EditorView | undefined;

  // Upload a pasted/dropped image file to /api/assets and return the path
  async function uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/assets', { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.path as string;
  }

  // Wrap selected text with a prefix/suffix (or insert a template at cursor)
  function wrapSelection(v: EditorView, before: string, after: string): boolean {
    const { state } = v;
    const changes = state.selection.ranges.map((range) => {
      if (range.empty) {
        return { from: range.from, insert: before + after };
      }
      const selectedText = state.doc.sliceString(range.from, range.to);
      return {
        from: range.from,
        to: range.to,
        insert: before + selectedText + after,
      };
    });
    v.dispatch({ changes });
    return true;
  }

  onMount(() => {
    const pasteHandler = EditorView.domEventHandlers({
      paste(event, v) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            uploadImage(file)
              .then((path) => {
                const pos = v.state.selection.main.from;
                const filename = path.split('/').pop() ?? 'image';
                v.dispatch({
                  changes: { from: pos, insert: `![${filename}](${path})` },
                });
              })
              .catch(console.error);
            return true;
          }
        }
        return false;
      },
    });

    const extensions = [
      // Core
      EditorState.readOnly.of(readonly),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onchange(update.state.doc.toString());
        }
      }),

      // Syntax + highlighting
      markdown(),
      syntaxHighlighting(defaultHighlightStyle),

      // Editing conveniences
      bracketMatching(),
      indentOnInput(),
      history(),

      // Line numbers
      lineNumbers(),

      // Key bindings
      keymap.of([
        {
          key: 'Mod-b',
          run(v) {
            return wrapSelection(v, '**', '**');
          },
          preventDefault: true,
        },
        {
          key: 'Mod-i',
          run(v) {
            return wrapSelection(v, '*', '*');
          },
          preventDefault: true,
        },
        {
          key: 'Mod-k',
          run(v) {
            const { state } = v;
            const sel = state.selection.main;
            const selectedText = sel.empty ? 'text' : state.doc.sliceString(sel.from, sel.to);
            v.dispatch({
              changes: { from: sel.from, to: sel.to, insert: `[${selectedText}](url)` },
            });
            return true;
          },
          preventDefault: true,
        },
        {
          key: 'Mod-s',
          run() {
            onsave?.();
            return true;
          },
          preventDefault: true,
        },
        indentWithTab,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
      ]),

      // Image paste
      pasteHandler,

      // Theme
      EditorView.theme({
        '&': {
          height: '100%',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.9rem',
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
        },
        '.cm-scroller': {
          height: '100%',
          overflow: 'auto',
          fontFamily: 'inherit',
        },
        '.cm-content': {
          padding: '1rem',
          caretColor: 'var(--color-accent)',
        },
        '.cm-focused': {
          outline: 'none',
        },
        '.cm-line': {
          lineHeight: '1.75',
        },
        '.cm-gutters': {
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-muted)',
          borderRight: '1px solid var(--color-border)',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'var(--color-bg-tertiary)',
        },
        '.cm-activeLine': {
          backgroundColor: 'color-mix(in srgb, var(--color-accent-bg) 30%, transparent)',
        },
        '.cm-selectionBackground, ::selection': {
          backgroundColor: 'color-mix(in srgb, var(--color-accent) 25%, transparent)',
        },
        '.cm-cursor': {
          borderLeftColor: 'var(--color-accent)',
        },
        '.cm-matchingBracket': {
          backgroundColor: 'color-mix(in srgb, var(--color-accent-bg) 60%, transparent)',
          outline: '1px solid var(--color-accent)',
        },
      }),
    ];

    const state = EditorState.create({
      doc: content,
      extensions,
    });

    view = new EditorView({
      state,
      parent: editorEl,
    });

    return () => {
      view?.destroy();
      view = undefined;
    };
  });

  // Sync external `content` changes into the editor without causing feedback loops
  $effect(() => {
    const nextContent = content;
    if (!view) return;
    const currentContent = view.state.doc.toString();
    if (currentContent !== nextContent) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: nextContent },
      });
    }
  });
</script>

<div class="cm-wrapper" bind:this={editorEl}></div>

<style>
  .cm-wrapper {
    height: 100%;
    width: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Ensure the codemirror editor takes full height inside wrapper */
  .cm-wrapper :global(.cm-editor) {
    height: 100%;
    width: 100%;
  }

  .cm-wrapper :global(.cm-scroller) {
    overflow: auto;
  }
</style>
