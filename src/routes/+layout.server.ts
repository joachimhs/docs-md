import type { LayoutServerLoad } from './$types';
import { getManifest } from '$lib/server/manifest';
import { loadConfig } from '$lib/server/config';
import { startWatcher, setNotifyFn } from '$lib/server/watcher';
import { notifyClients } from '$lib/server/sse';
import { startAutoPull, setAutoPullNotifyFn } from '$lib/server/autopull';

let watcherStarted = false;

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!watcherStarted) {
    setNotifyFn(notifyClients);
    setAutoPullNotifyFn(notifyClients);
    startWatcher();
    startAutoPull();
    watcherStarted = true;
  }

  const manifest = getManifest();
  const config = loadConfig();

  return {
    manifest,
    config,
    user: locals.user,
    authEnabled: locals.authEnabled,
  };
};
