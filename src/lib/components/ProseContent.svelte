<script lang="ts">
  import MermaidDiagram from './MermaidDiagram.svelte';

  let { html }: { html: string } = $props();

  interface Segment {
    type: 'html' | 'mermaid';
    content: string;
  }

  // Decode HTML entities that rehype-stringify encodes in attribute values
  function decodeAttrEntities(s: string): string {
    return s
      .replace(/&#x22;/g, '"')
      .replace(/&quot;/g, '"')
      .replace(/&#x3C;/g, '<')
      .replace(/&lt;/g, '<')
      .replace(/&#x3E;/g, '>')
      .replace(/&gt;/g, '>')
      .replace(/&#x26;/g, '&')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
  }

  // Split the rendered HTML into plain HTML segments and mermaid diagram segments.
  // The server marks mermaid blocks as <pre data-mermaid="true" data-code="...">...</pre>
  const segments: Segment[] = $derived.by(() => {
    const result: Segment[] = [];
    // Match entire <pre> blocks that carry data-mermaid="true"
    const blockRegex = /<pre\b[^>]*\bdata-mermaid="true"[^>]*>[\s\S]*?<\/pre>/g;
    // Extract the data-code attribute value from within the matched block
    const codeAttrRegex = /\bdata-code="([^"]*)"/;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(html)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'html', content: html.slice(lastIndex, match.index) });
      }

      const codeMatch = codeAttrRegex.exec(match[0]);
      const rawCode = codeMatch ? codeMatch[1] : '';
      result.push({ type: 'mermaid', content: decodeAttrEntities(rawCode) });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < html.length) {
      result.push({ type: 'html', content: html.slice(lastIndex) });
    }

    return result.length > 0 ? result : [{ type: 'html', content: html }];
  });
</script>

<article class="prose">
  {#each segments as segment}
    {#if segment.type === 'mermaid'}
      <MermaidDiagram code={segment.content} />
    {:else}
      {@html segment.content}
    {/if}
  {/each}
</article>
