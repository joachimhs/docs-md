<script lang="ts">
  import { ui } from '$lib/stores/ui.svelte';

  function cycle() {
    const modes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const idx = modes.indexOf(ui.theme);
    ui.setTheme(modes[(idx + 1) % modes.length]);
  }

  const icons = { light: '☀️', dark: '🌙', auto: '◑' } as const;
</script>

<button class="theme-toggle" onclick={cycle} title="Theme: {ui.theme}">
  {icons[ui.theme]}
</button>

<style>
  .theme-toggle {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 1rem;
    color: var(--color-text);
  }

  .theme-toggle:hover {
    background: var(--color-bg-secondary);
  }
</style>
