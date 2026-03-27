import chokidar from 'chokidar';
import { DOCS_ROOT } from './config';
import { invalidateManifest } from './manifest';
import { invalidateSearchIndex } from './search';

let watcher: ReturnType<typeof chokidar.watch> | null = null;
let reindexTimer: ReturnType<typeof setTimeout> | null = null;
let notifyFn: ((event: string, data: Record<string, unknown>) => void) | null = null;

export function setNotifyFn(fn: (event: string, data: Record<string, unknown>) => void) {
  notifyFn = fn;
}

/**
 * Start watching the docs directory for file changes.
 * When .md files are added, changed, or removed, the manifest
 * and search index are invalidated so the next request picks
 * up the new state.
 *
 * Called once on server startup from the root layout load.
 */
export function startWatcher() {
  if (watcher) return;

  watcher = chokidar.watch(DOCS_ROOT, {
    ignoreInitial: true,
    ignored: [
      '**/node_modules/**',
      '**/_archive/**',
    ],
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  const handleChange = (filePath: string) => {
    if (!filePath.endsWith('.md')) return;
    console.log(`[watcher] File changed: ${filePath}`);
    invalidateManifest();
    debounceReindex();
    notifyFn?.('docs-changed', { path: filePath });
  };

  watcher.on('add', handleChange);
  watcher.on('change', handleChange);
  watcher.on('unlink', handleChange);
}

function debounceReindex() {
  if (reindexTimer) clearTimeout(reindexTimer);
  reindexTimer = setTimeout(() => {
    invalidateSearchIndex();
    console.log('[watcher] Manifest and search index invalidated');
  }, 500);
}

export function stopWatcher() {
  watcher?.close();
  watcher = null;
}
