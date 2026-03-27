import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5176,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    alias: {
      '$lib': resolve(__dirname, 'src/lib'),
      '$env/dynamic/private': resolve(__dirname, 'tests/mocks/env.ts'),
    },
    env: { DOCSMD_DOCS_DIR: 'test-docs' },
  },
});
