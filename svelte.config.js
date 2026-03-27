import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const useStatic = process.env.DOCSMD_ADAPTER === 'static';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: useStatic
      ? adapterStatic({
          pages: 'build-static',
          assets: 'build-static',
          fallback: '404.html',
          precompress: true,
          strict: false,
        })
      : adapterNode(),
  },
};
