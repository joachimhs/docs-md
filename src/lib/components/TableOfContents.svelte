<script lang="ts">
  import type { DocHeading } from '$lib/types';

  let { headings }: { headings: DocHeading[] } = $props();

  let activeSlug = $state<string | null>(null);

  $effect(() => {
    if (typeof window === 'undefined' || headings.length === 0) return;

    const slugs = headings.map(h => h.slug);
    const elements: Element[] = [];

    for (const slug of slugs) {
      const el = document.getElementById(slug);
      if (el) elements.push(el);
    }

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible heading
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => {
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });
        if (visible.length > 0) {
          activeSlug = visible[0].target.id;
        }
      },
      {
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0,
      }
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
    };
  });

  function indentPx(level: number): string {
    // level 1 = 0px, level 2 = 12px, level 3 = 24px, etc.
    return `${(level - 1) * 12}px`;
  }
</script>

<nav class="toc">
  <p class="toc-heading">On this page</p>
  <ul class="toc-list">
    {#each headings as heading (heading.slug)}
      <li style="padding-left: {indentPx(heading.level)}">
        <a
          href="#{heading.slug}"
          class="toc-link"
          class:active={activeSlug === heading.slug}
        >
          {heading.text}
        </a>
      </li>
    {/each}
  </ul>
</nav>

<style>
  .toc {
    font-size: var(--text-sm);
  }

  .toc-heading {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    margin: 0 0 var(--spacing-sm) 0;
  }

  .toc-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .toc-link {
    display: block;
    padding: 0.25rem 0.4rem;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    text-decoration: none;
    line-height: 1.4;
    transition: color 0.12s ease, background 0.12s ease;
    border-left: 2px solid transparent;
  }

  .toc-link:hover {
    color: var(--color-text);
    background: var(--color-bg-tertiary);
  }

  .toc-link.active {
    color: var(--color-accent);
    border-left-color: var(--color-accent);
    font-weight: 600;
  }
</style>
