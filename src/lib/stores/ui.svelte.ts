class UIState {
  sidebarOpen = $state(true);
  theme = $state<'light' | 'dark' | 'auto'>('auto');

  resolvedTheme = $derived(
    this.theme === 'auto'
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : this.theme
  );

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  setTheme(theme: 'light' | 'dark' | 'auto') {
    this.theme = theme;
    if (typeof window !== 'undefined') {
      localStorage.setItem('docsmd-theme', theme);
    }
  }

  loadSavedTheme() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('docsmd-theme') as 'light' | 'dark' | 'auto' | null;
      if (saved) this.theme = saved;
    }
  }
}

export const ui = new UIState();
