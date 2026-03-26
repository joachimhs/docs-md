<script lang="ts">
  import type { ManifestEntry, SpecMDConfig } from '$lib/types';

  let {
    manifest,
    config,
    activePath,
  }: {
    manifest: ManifestEntry[];
    config: SpecMDConfig | null;
    activePath: string | null;
  } = $props();
</script>

<nav class="sidebar-nav">
  <p class="sidebar-placeholder">Sidebar — coming soon</p>
</nav>

<style>
  .sidebar-nav {
    padding: 0.5rem;
  }
  .sidebar-placeholder {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
</style>
