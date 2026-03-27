import type { LayoutServerLoad } from './$types';
import { getManifest } from '$lib/server/manifest';
import { loadConfig } from '$lib/server/config';
import { startWatcher } from '$lib/server/watcher';

let watcherStarted = false;

export const load: LayoutServerLoad = async () => {
  if (!watcherStarted) {
    startWatcher();
    watcherStarted = true;
  }

  const manifest = getManifest();
  const config = loadConfig();

  return {
    manifest,
    config,
  };
};
