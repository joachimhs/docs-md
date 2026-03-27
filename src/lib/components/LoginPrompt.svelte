<script lang="ts">
  let { action = 'edit' }: { action?: string } = $props();
</script>

<div class="login-prompt">
  <p>Sign in to {action} this document.</p>
  <a href="/auth/login" class="btn-signin">Sign In</a>
</div>

<style>
  .login-prompt {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg-secondary);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .login-prompt p {
    margin: 0;
  }

  .btn-signin {
    padding: 0.25rem 0.6rem;
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-sm);
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 600;
    font-size: var(--text-sm);
    white-space: nowrap;
  }

  .btn-signin:hover {
    background: var(--color-accent);
    color: #fff;
  }
</style>
