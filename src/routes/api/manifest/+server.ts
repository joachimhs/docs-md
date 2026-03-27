import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { generateManifest } from '$lib/server/manifest';

export const POST: RequestHandler = async () => {
  const manifest = generateManifest();
  return json({
    document_count: manifest.document_count,
    generated: manifest.generated,
  });
};
