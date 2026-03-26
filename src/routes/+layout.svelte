<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';
  import { docs } from '$lib/stores/docs.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  // Initialize stores from server data
  $effect(() => {
    docs.initialize(data.manifest, data.config);
  });

  // Load saved theme preference
  $effect(() => {
    ui.loadSavedTheme();
  });

  // Sync resolved theme to the html element attribute
  $effect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', ui.resolvedTheme);
    }
  });
</script>

<div class="app-layout">
  <header class="app-header">
    <button class="hamburger" onclick={() => ui.toggleSidebar()}>☰</button>
    <a href="/" class="logo">{docs.config?.project.name || 'spec.md'}</a>
    <div class="header-search"><!-- SearchBar will go here later --></div>
    <ThemeToggle />
  </header>

  <div class="app-body">
    {#if ui.sidebarOpen}
      <aside class="app-sidebar">
        <Sidebar manifest={docs.manifest} config={docs.config} activePath={docs.activeDocPath} />
      </aside>
    {/if}

    <main class="app-main">
      {@render children()}
    </main>
  </div>

  <footer class="app-footer">
    Powered by spec.md
  </footer>
</div>

<style>
  .app-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .app-header {
    height: var(--header-height);
    display: flex;
    align-items: center;
    padding: 0 var(--spacing-md);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    position: sticky;
    top: 0;
    z-index: 100;
    gap: var(--spacing-md);
  }

  .logo {
    font-weight: 700;
    font-size: var(--text-lg);
    color: var(--color-text);
    text-decoration: none;
  }

  .header-search {
    flex: 1;
    max-width: 400px;
  }

  .app-body {
    display: flex;
    flex: 1;
  }

  .app-sidebar {
    width: var(--sidebar-width);
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
    position: sticky;
    top: var(--header-height);
    height: calc(100vh - var(--header-height));
    padding: var(--spacing-md);
    background: var(--color-bg-secondary);
  }

  .app-main {
    flex: 1;
    padding: var(--spacing-xl);
    max-width: 100%;
    overflow-x: hidden;
  }

  .app-footer {
    padding: var(--spacing-md);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    border-top: 1px solid var(--color-border);
  }

  .hamburger {
    display: none;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-text);
  }

  @media (max-width: 768px) {
    .hamburger {
      display: block;
    }

    .app-sidebar {
      position: fixed;
      top: var(--header-height);
      left: 0;
      bottom: 0;
      z-index: 50;
      transform: translateX(0);
    }
  }
</style>
