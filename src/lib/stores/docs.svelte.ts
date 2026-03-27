import type { ManifestEntry, Manifest, DocsMDConfig } from '$lib/types';

class DocsState {
  manifest = $state<ManifestEntry[]>([]);
  config = $state<DocsMDConfig | null>(null);
  activeDocPath = $state<string | null>(null);
  loading = $state(false);

  byType = $derived(
    this.manifest.reduce((acc, doc) => {
      (acc[doc.type] ??= []).push(doc);
      return acc;
    }, {} as Record<string, ManifestEntry[]>)
  );

  types = $derived([...new Set(this.manifest.map(d => d.type))].sort());

  allTags = $derived(
    [...new Set(this.manifest.flatMap(d => d.tags))].sort()
  );

  recentDocs = $derived(
    [...this.manifest]
      .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))
      .slice(0, 10)
  );

  initialize(manifest: Manifest, config: DocsMDConfig) {
    this.manifest = manifest.documents;
    this.config = config;
  }
}

export const docs = new DocsState();
