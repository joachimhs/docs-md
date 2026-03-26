import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['tests/**/*.test.ts'],
    alias: {
      '$lib': './src/lib',
      '$env/dynamic/private': './tests/mocks/env.ts',
    },
    env: { SPECMD_DOCS_DIR: 'test-docs' },
  },
});
