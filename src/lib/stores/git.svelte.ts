class GitState {
  branch = $state('');
  modified = $state<string[]>([]);
  added = $state<string[]>([]);
  ahead = $state(0);
  behind = $state(0);
  loading = $state(false);
  isRepo = $state(true);
  hasRemote = $state(false);

  // Auto-pull state
  pullState = $state<'active' | 'blocked' | 'disabled' | 'no-remote'>('disabled');
  lastPull = $state<string | null>(null);
  pullMessage = $state<string | null>(null);
  pulling = $state(false);

  isModified(docPath: string) {
    return this.modified.some(f => f.endsWith(docPath)) ||
           this.added.some(f => f.endsWith(docPath));
  }

  get modifiedCount() {
    return this.modified.length + this.added.length;
  }

  async refresh() {
    this.loading = true;
    try {
      const res = await fetch('/api/git/status');
      if (!res.ok) { this.isRepo = false; this.loading = false; return; }
      const data = await res.json();
      this.branch = data.branch;
      this.modified = data.modified;
      this.added = data.added;
      this.ahead = data.ahead;
      this.behind = data.behind;
      this.hasRemote = data.hasRemote ?? false;
      this.isRepo = true;
    } catch {
      this.isRepo = false;
    }
    this.loading = false;
  }

  async refreshPullStatus() {
    try {
      const res = await fetch('/api/git/pull');
      if (!res.ok) return;
      const data = await res.json();
      this.pullState = data.state;
      this.lastPull = data.lastPull;
      this.pullMessage = data.lastMessage;
    } catch {
      // ignore
    }
  }

  async triggerPull() {
    this.pulling = true;
    try {
      const res = await fetch('/api/git/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      this.pullState = data.state;
      this.pullMessage = data.message;
      if (data.pulled) {
        this.lastPull = new Date().toISOString();
      }
      await this.refresh();
      return data;
    } catch (e) {
      this.pullMessage = 'Pull failed: network error';
      return { pulled: false, message: 'Network error' };
    } finally {
      this.pulling = false;
    }
  }

  async resetToRemote() {
    this.pulling = true;
    try {
      const res = await fetch('/api/git/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      await this.refresh();
      await this.refreshPullStatus();
      return data;
    } catch (e) {
      return { reset: false, message: 'Network error' };
    } finally {
      this.pulling = false;
    }
  }
}

export const gitState = new GitState();
