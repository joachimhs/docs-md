import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeShiki from '@shikijs/rehype';
import rehypeSlug from 'rehype-slug';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let processor: any = null;

async function getProcessor() {
  if (processor) return processor;

  processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeShiki, {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    })
    .use(rehypeSlug)
    .use(rehypeStringify, { allowDangerousHtml: true });

  return processor;
}

export async function renderMarkdown(markdown: string): Promise<string> {
  const proc = await getProcessor();
  const result = await proc.process(markdown);
  return String(result);
}
