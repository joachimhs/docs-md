<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  interface CommitEntry {
    hash: string;
    short_hash: string;
    author: string;
    email: string;
    date: string;
    message: string;
  }

  // Get path from URL params
  let docPath = $derived($page.params.path + '.md');

  let history = $state<CommitEntry[]>([]);
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    try {
      const res = await fetch(`/api/git/history?path=${encodeURIComponent(docPath)}`);
      if (!res.ok) throw new Error('Failed to load history');
      history = await res.json() as CommitEntry[];
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Unknown error';
    }
    loading = false;
  });

  function timeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  // Back link: strip .md from path
  let backPath = $derived($page.params.path);
</script>

<div class="history-page">
  <div class="page-header">
    <a href="/doc/{backPath}" class="back-link">&larr; Back to document</a>
    <h1 class="page-title">History: <span class="doc-path">{docPath}</span></h1>
  </div>

  {#if loading}
    <div class="state-message loading">Loading history…</div>
  {:else if error}
    <div class="state-message error" role="alert">
      <strong>Error:</strong> {error}
    </div>
  {:else if history.length === 0}
    <div class="state-message empty">No history found for this document.</div>
  {:else}
    <ol class="timeline" aria-label="Commit history">
      {#each history as commit (commit.hash)}
        <li class="timeline-entry">
          <div class="timeline-marker"></div>
          <div class="commit-card">
            <div class="commit-meta">
              <code class="commit-hash">{commit.short_hash}</code>
              <span class="commit-author">{commit.author}</span>
              <time class="commit-time" datetime={commit.date} title={new Date(commit.date).toLocaleString()}>
                {timeAgo(commit.date)}
              </time>
            </div>
            <p class="commit-message">{commit.message}</p>
            <div class="commit-actions">
              <a href="/diff/{backPath}?from={commit.hash}" class="btn-diff">
                View diff
              </a>
            </div>
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .history-page {
    max-width: 760px;
    margin: 0 auto;
    padding: var(--spacing-xl) var(--spacing-md);
  }

  .page-header {
    margin-bottom: var(--spacing-xl);
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    margin-bottom: var(--spacing-sm);
    transition: color 0.12s ease;
  }

  .back-link:hover {
    color: var(--color-accent);
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

  /* State messages */
  .state-message {
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    font-size: var(--text-base);
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

  /* Timeline */
  .timeline {
    list-style: none;
    padding: 0;
    margin: 0;
    position: relative;
  }

  .timeline::before {
    content: '';
    position: absolute;
    left: 10px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--color-border);
  }

  .timeline-entry {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    position: relative;
  }

  .timeline-marker {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--color-bg);
    border: 2px solid var(--color-accent);
    margin-top: 14px;
    z-index: 1;
  }

  .commit-card {
    flex: 1;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md) var(--spacing-lg);
    transition: box-shadow 0.15s ease;
  }

  .commit-card:hover {
    box-shadow: var(--shadow-md);
  }

  .commit-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
    margin-bottom: 0.4rem;
  }

  .commit-hash {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-sm);
  }

  .commit-author {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .commit-time {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-left: auto;
  }

  .commit-message {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-sm);
    line-height: 1.5;
  }

  .commit-actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .btn-diff {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.65rem;
    font-size: var(--text-xs);
    font-weight: 600;
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-sm);
    color: var(--color-accent);
    text-decoration: none;
    background: none;
    transition: background 0.12s ease, color 0.12s ease;
  }

  .btn-diff:hover {
    background: var(--color-accent);
    color: #fff;
  }

  @media (max-width: 600px) {
    .timeline::before {
      display: none;
    }

    .timeline-marker {
      display: none;
    }

    .timeline-entry {
      gap: 0;
    }
  }
</style>
