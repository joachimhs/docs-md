import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { DOCS_ROOT } from '$lib/server/config';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export const GET: RequestHandler = async ({ params }) => {
  const filePath = resolve(DOCS_ROOT, '_assets', params.filename);

  if (!existsSync(filePath)) throw error(404, 'Asset not found');

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const buffer = readFileSync(filePath);

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
