class GitState {
  branch = $state('');
  modified = $state<string[]>([]);
  added = $state<string[]>([]);
  ahead = $state(0);
  behind = $state(0);
  loading = $state(false);
  isRepo = $state(true);
  hasRemote = $state(false);

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
}

export const gitState = new GitState();
