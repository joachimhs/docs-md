<script lang="ts">
  let { status, type }: { status: string; type?: string } = $props();

  function getBadgeColor(): string {
    if (type) {
      const colors: Record<string, string> = {
        adr: 'var(--badge-adr)',
        spec: 'var(--badge-spec)',
        guide: 'var(--badge-guide)',
        runbook: 'var(--badge-runbook)',
        api: 'var(--badge-api)',
        rfc: 'var(--badge-rfc)',
        meeting: 'var(--badge-meeting)',
        doc: 'var(--badge-doc)',
      };
      return colors[type] || 'var(--badge-doc)';
    }
    return 'var(--color-text-secondary)';
  }
</script>

<span class="badge" style="background: {getBadgeColor()}; color: white;">
  {status}
</span>

<style>
  .badge {
    display: inline-block;
    padding: 0.15em 0.5em;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
