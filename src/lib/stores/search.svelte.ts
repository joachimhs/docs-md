import type { SearchResult, SearchFilters, SearchResponse } from '$lib/types';

class SearchState {
  query = $state('');
  results = $state<SearchResult[]>([]);
  total = $state(0);
  filters = $state<SearchFilters>({ type: null, status: null, tags: [], owner: null });
  facets = $state<SearchResponse['facets']>({ type: {}, status: {}, tags: {} });
  loading = $state(false);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  setQuery(q: string) {
    this.query = q;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.executeSearch(), 150);
  }

  toggleTypeFilter(type: string) {
    this.filters.type = this.filters.type === type ? null : type;
    this.executeSearch();
  }

  toggleStatusFilter(status: string) {
    this.filters.status = this.filters.status === status ? null : status;
    this.executeSearch();
  }

  toggleTagFilter(tag: string) {
    const idx = this.filters.tags.indexOf(tag);
    if (idx >= 0) {
      this.filters.tags = this.filters.tags.filter(t => t !== tag);
    } else {
      this.filters.tags = [...this.filters.tags, tag];
    }
    this.executeSearch();
  }

  clearFilters() {
    this.filters = { type: null, status: null, tags: [], owner: null };
    this.executeSearch();
  }

  private async executeSearch() {
    if (!this.query.trim()) {
      this.results = [];
      this.total = 0;
      return;
    }

    this.loading = true;
    const params = new URLSearchParams({ q: this.query });
    if (this.filters.type) params.set('type', this.filters.type);
    if (this.filters.status) params.set('status', this.filters.status);
    if (this.filters.tags.length) params.set('tag', this.filters.tags[0]);

    const res = await fetch(`/api/search?${params}`);
    const data: SearchResponse = await res.json();

    this.results = data.results;
    this.total = data.total;
    this.facets = data.facets;
    this.loading = false;
  }
}

export const search = new SearchState();
