<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';
  import { docs } from '$lib/stores/docs.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { gitState } from '$lib/stores/git.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
  let searchBar = $state<{ focusInput: () => void } | null>(null);

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

  // Fetch git status once on mount
  $effect(() => {
    gitState.refresh();
  });

  let pushing = $state(false);

  async function handleGlobalPush() {
    if (pushing) return;
    pushing = true;
    try {
      const res = await fetch('/api/git/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok || !data.pushed) {
        console.error('Push failed:', data.reason || 'unknown error');
      }
      await gitState.refresh();
    } catch (e) {
      console.error('Push error:', e);
    } finally {
      pushing = false;
    }
  }

  // Global Ctrl+K / Cmd+K shortcut to focus search
  $effect(() => {
    if (typeof window === 'undefined') return;

    function handleGlobalKeydown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchBar?.focusInput();
      }
    }

    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  });
</script>

<div class="app-layout">
  <header class="app-header">
    <button class="hamburger" onclick={() => ui.toggleSidebar()}>☰</button>
    <a href="/" class="logo">{docs.config?.project.name || 'docs.md'}</a>
    <div class="header-search">
      <SearchBar bind:this={searchBar} />
    </div>
    {#if gitState.isRepo}
      <div class="git-indicators">
        {#if gitState.branch}
          <span class="git-branch">⎇ {gitState.branch}</span>
        {/if}
        {#if gitState.modifiedCount > 0}
          <span class="git-modified-badge">{gitState.modifiedCount}</span>
        {/if}
        {#if gitState.ahead > 0}
          <button
            class="btn-push"
            onclick={handleGlobalPush}
            disabled={pushing}
            title="Push {gitState.ahead} commit{gitState.ahead > 1 ? 's' : ''} to remote"
          >
            {pushing ? 'Pushing…' : `Push ↑${gitState.ahead}`}
          </button>
        {/if}
        {#if gitState.behind > 0}
          <span class="git-sync">↓{gitState.behind}</span>
        {/if}
      </div>
    {/if}
    <a href="/new" class="btn-new">+ New</a>
    <ThemeToggle />
  </header>

  <div class="app-body">
    <button
      class="sidebar-backdrop"
      class:visible={ui.sidebarOpen}
      onclick={() => ui.toggleSidebar()}
      aria-label="Close sidebar"
      tabindex="-1"
    ></button>
    <aside class="app-sidebar" class:sidebar-open={ui.sidebarOpen}>
      <Sidebar manifest={docs.manifest} config={docs.config} activePath={docs.activeDocPath} onLinkClick={() => { if (ui.sidebarOpen) ui.toggleSidebar(); }} />
    </aside>

    <main class="app-main">
      {@render children()}
    </main>
  </div>

  <footer class="app-footer">
    Powered by docs.md
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
    flex-shrink: 0;
  }

  .app-main {
    flex: 1;
    padding: var(--spacing-xl);
    min-width: 0;
  }

  .app-footer {
    padding: var(--spacing-md);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    border-top: 1px solid var(--color-border);
  }

  .git-indicators {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .git-branch {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    white-space: nowrap;
  }

  .git-modified-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    background: #f97316;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
  }

  .git-sync {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .btn-push {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.55rem;
    font-size: var(--text-xs);
    font-weight: 600;
    border: 1px solid var(--color-success);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-success);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s ease, color 0.12s ease;
  }

  .btn-push:hover:not(:disabled) {
    background: var(--color-success);
    color: #fff;
  }

  .btn-push:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-new {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.65rem;
    font-size: var(--text-sm);
    font-weight: 600;
    border-radius: var(--radius-sm);
    background: var(--color-accent);
    color: #fff;
    text-decoration: none;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.12s ease;
  }

  .btn-new:hover {
    background: var(--color-accent-hover);
  }

  .hamburger {
    display: none;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-text);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
  }

  .hamburger:hover {
    background: var(--color-bg-secondary);
  }

  .sidebar-backdrop {
    display: none;
    padding: 0;
    border: none;
    background: none;
    cursor: default;
  }

  @media (max-width: 768px) {
    .hamburger {
      display: block;
    }

    /* On mobile, hide sidebar by default (slide off-screen) */
    .app-sidebar {
      position: fixed;
      top: var(--header-height);
      left: 0;
      bottom: 0;
      z-index: 50;
      width: min(var(--sidebar-width), 85vw);
      transform: translateX(-100%);
      transition: transform 0.25s ease;
    }

    /* Show sidebar when open */
    .app-sidebar.sidebar-open {
      transform: translateX(0);
    }

    /* Backdrop only visible when sidebar is open on mobile */
    .sidebar-backdrop.visible {
      display: block;
      position: fixed;
      inset: 0;
      top: var(--header-height);
      background: rgba(0, 0, 0, 0.4);
      z-index: 40;
    }
  }
</style>
