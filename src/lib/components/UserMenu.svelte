<script lang="ts">
  import type { AuthUser } from '$lib/types';

  let { user, authEnabled }: { user: AuthUser | null; authEnabled: boolean } = $props();
  let menuOpen = $state(false);
</script>

{#if authEnabled}
  {#if user}
    <div class="user-menu">
      <button class="user-button" onclick={() => (menuOpen = !menuOpen)}>
        {#if user.avatar}
          <img src={user.avatar} alt="" class="user-avatar" />
        {:else}
          <span class="user-avatar-fallback">{user.name.charAt(0).toUpperCase()}</span>
        {/if}
        <span class="user-name">{user.name}</span>
        <span class="role-badge role-{user.role}">{user.role}</span>
      </button>

      {#if menuOpen}
        <div class="user-dropdown">
          <div class="dropdown-info">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <a href="/auth/logout" class="dropdown-item">Sign Out</a>
        </div>
      {/if}
    </div>
  {:else}
    <a href="/auth/login" class="btn-signin">Sign In</a>
  {/if}
{/if}

<style>
  .user-menu {
    position: relative;
  }

  .user-button {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    font-size: var(--text-sm);
  }

  .user-button:hover {
    background: var(--color-bg-secondary);
  }

  .user-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }

  .user-avatar-fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-accent);
    color: #fff;
    font-size: 12px;
    font-weight: 700;
  }

  .user-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .role-badge {
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-sm);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .role-admin { background: #fef3c7; color: #92400e; }
  .role-editor { background: #dbeafe; color: #1d4ed8; }
  .role-viewer { background: #f3f4f6; color: #6b7280; }

  .user-dropdown {
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 0.25rem;
    padding: var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    min-width: 200px;
    z-index: 200;
  }

  .dropdown-info {
    display: flex;
    flex-direction: column;
    padding: var(--spacing-sm);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--spacing-xs);
    font-size: var(--text-sm);
  }

  .dropdown-info span {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .dropdown-item {
    display: block;
    padding: var(--spacing-sm);
    color: var(--color-text);
    text-decoration: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
  }

  .dropdown-item:hover {
    background: var(--color-bg-secondary);
  }

  .btn-signin {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.65rem;
    font-size: var(--text-sm);
    font-weight: 600;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    text-decoration: none;
    white-space: nowrap;
  }

  .btn-signin:hover {
    background: var(--color-bg-secondary);
  }
</style>
