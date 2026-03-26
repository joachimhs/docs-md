import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '$lib/server/markdown';

describe('renderMarkdown', () => {
  it('should render basic markdown to HTML', async () => {
    const html = await renderMarkdown('# Hello World');
    expect(html).toContain('<h1');
    expect(html).toContain('Hello World');
  });

  it('should render GFM tables', async () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    const html = await renderMarkdown(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<td>');
  });

  it('should render GFM task lists', async () => {
    const md = '- [x] Done\n- [ ] Todo';
    const html = await renderMarkdown(md);
    expect(html).toContain('checkbox');
  });

  it('should syntax-highlight code blocks', async () => {
    const md = '```javascript\nconst x = 1;\n```';
    const html = await renderMarkdown(md);
    expect(html).toContain('<pre');
    expect(html).toContain('<code');
  });

  it('should handle empty input', async () => {
    const html = await renderMarkdown('');
    expect(typeof html).toBe('string');
  });

  it('should render bold and italic', async () => {
    const html = await renderMarkdown('**bold** and *italic*');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('should add id attributes to headings (rehype-slug)', async () => {
    const html = await renderMarkdown('## My Section');
    expect(html).toContain('id="my-section"');
  });

  it('should render links', async () => {
    const html = await renderMarkdown('[Click me](https://example.com)');
    expect(html).toContain('<a');
    expect(html).toContain('href="https://example.com"');
  });

  it('should render blockquotes', async () => {
    const html = await renderMarkdown('> Quote text');
    expect(html).toContain('<blockquote>');
  });
});
