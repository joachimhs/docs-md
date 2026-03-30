import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { DOCS_ROOT } from '$lib/server/config';

export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) throw error(400, 'No file provided');

  // 10MB upload limit
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) throw error(413, 'File too large (max 10MB)');

  const assetsDir = resolve(DOCS_ROOT, '_assets');
  if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true });

  const ext = extname(file.name) || '.bin';
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${timestamp}-${safeName}`;
  const filePath = resolve(assetsDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(filePath, buffer);

  return json({
    path: `_assets/${filename}`,
    url: `/api/assets/${filename}`,
  }, { status: 201 });
};
