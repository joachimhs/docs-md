import type { LayoutServerLoad } from './$types';
import { getManifest } from '$lib/server/manifest';
import { loadConfig } from '$lib/server/config';

export const load: LayoutServerLoad = async () => {
  const manifest = getManifest();
  const config = loadConfig();

  return {
    manifest,
    config,
  };
};
