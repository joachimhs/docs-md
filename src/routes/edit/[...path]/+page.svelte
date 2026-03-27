<script lang="ts">
  import DocEditor from '$lib/components/DocEditor.svelte';

  let { data } = $props();

  // Track dirty state for beforeunload warning
  // DocEditor owns dirty state internally; we expose it via a binding if needed.
  // For now we use a simple document-level handler that always warns when navigating away.
  // A more refined approach would pass isDirty up via a callback.
  let warnOnUnload = $state(false);

  $effect(() => {
    if (typeof window === 'undefined') return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (warnOnUnload) {
        e.preventDefault();
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });
</script>

<div class="edit-page">
  <DocEditor
    initialFrontmatter={data.frontmatter}
    initialBody={data.body}
    docPath={data.path}
    config={data.config}
  />
</div>

<style>
  .edit-page {
    height: calc(100vh - var(--header-height));
    display: flex;
    flex-direction: column;
  }
</style>
