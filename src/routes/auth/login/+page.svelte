<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();
</script>

<div class="login-page">
  <div class="login-card">
    <h1>Sign In</h1>

    {#if data.mode === 'simple'}
      <form method="POST" action="?/login" use:enhance>
        {#if form?.error}
          <div class="error-message">{form.error}</div>
        {/if}

        <label>
          Email
          <input
            type="email"
            name="email"
            value={form?.email ?? ''}
            required
            autocomplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            required
            autocomplete="current-password"
          />
        </label>

        <button type="submit" class="btn-primary">Sign In</button>
      </form>

    {:else if data.mode === 'oauth'}
      <a href="/auth/callback?start=1" class="btn-oauth">
        Sign in with {data.provider.charAt(0).toUpperCase() + data.provider.slice(1)}
      </a>
    {:else}
      <p>Authentication is not enabled.</p>
    {/if}

    <a href="/" class="skip-link">Continue without signing in</a>
  </div>
</div>

<style>
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
  }

  .login-card {
    width: 100%;
    max-width: 400px;
    padding: var(--spacing-xl);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg);
  }

  .login-card h1 {
    margin: 0 0 var(--spacing-lg);
    font-size: var(--text-xl);
    text-align: center;
  }

  label {
    display: block;
    margin-bottom: var(--spacing-md);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  input {
    display: block;
    width: 100%;
    margin-top: var(--spacing-xs);
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--text-base);
    background: var(--color-bg);
    color: var(--color-text);
  }

  input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: -1px;
  }

  .btn-primary {
    width: 100%;
    padding: 0.6rem;
    margin-top: var(--spacing-md);
    border: none;
    border-radius: var(--radius-sm);
    background: var(--color-accent);
    color: #fff;
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
  }

  .btn-primary:hover {
    background: var(--color-accent-hover);
  }

  .btn-oauth {
    display: block;
    width: 100%;
    padding: 0.6rem;
    text-align: center;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    color: var(--color-text);
    text-decoration: none;
    font-weight: 600;
  }

  .btn-oauth:hover {
    background: var(--color-bg-secondary);
  }

  .error-message {
    padding: var(--spacing-sm) var(--spacing-md);
    margin-bottom: var(--spacing-md);
    border-radius: var(--radius-sm);
    background: #fef2f2;
    color: #dc2626;
    font-size: var(--text-sm);
  }

  .skip-link {
    display: block;
    margin-top: var(--spacing-lg);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
</style>
