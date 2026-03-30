import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeShiki from '@shikijs/rehype';
import rehypeSlug from 'rehype-slug';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { ShikiTransformer } from '@shikijs/types';

// Extend the default sanitization schema to allow Shiki's code highlighting attributes
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
    pre: [
      ...(defaultSchema.attributes?.pre || []),
      'className',
      'style',
      'tabIndex',
      // Allow data-mermaid and data-code for client-side mermaid rendering
      'dataMermaid',
      'dataCode',
    ],
    // Allow id for heading anchors (rehype-slug)
    '*': [...(defaultSchema.attributes?.['*'] || []), 'id'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'mark', // for search highlight
  ],
  // Don't prefix IDs — our TOC and heading anchors depend on clean slugs
  clobberPrefix: '',
};

// Shiki transformer to mark mermaid code blocks with data attributes
// so the client can detect and render them
const mermaidTransformer: ShikiTransformer = {
  name: 'mermaid-marker',
  pre(node) {
    // `this.options.lang` is the language string from the fenced code block
    if (this.options.lang === 'mermaid') {
      node.properties['dataMermaid'] = 'true';
      // Store the raw source so the client can pass it to mermaid.render()
      node.properties['dataCode'] = this.source;
    }
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let processor: any = null;

async function getProcessor() {
  if (processor) return processor;

  processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeShiki, {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      transformers: [mermaidTransformer],
    })
    .use(rehypeSlug)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify);

  return processor;
}

export async function renderMarkdown(markdown: string): Promise<string> {
  const proc = await getProcessor();
  const result = await proc.process(markdown);
  return String(result);
}
