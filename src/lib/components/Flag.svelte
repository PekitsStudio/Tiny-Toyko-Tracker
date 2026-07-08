<script lang="ts">
  import { langLabel } from '$lib/format';

  let { lang }: { lang?: string | null } = $props();

  // Sprache -> Laendercode fuer die Flagge (en->gb, ja->jp usw.)
  const MAP: Record<string, string> = {
    de: 'de', en: 'gb', fr: 'fr', es: 'es', it: 'it', pt: 'pt', 'pt-br': 'br', 'pt-pt': 'pt',
    nl: 'nl', pl: 'pl', ru: 'ru', ja: 'jp', ko: 'kr', 'zh-tw': 'tw', 'zh-cn': 'cn',
    zhs: 'cn', zht: 'tw', id: 'id', th: 'th'
  };
  const cc = $derived(lang ? (MAP[String(lang).toLowerCase()] ?? null) : null);
</script>

{#if cc}
  <img
    class="flag-img"
    src={`https://flagcdn.com/20x15/${cc}.png`}
    srcset={`https://flagcdn.com/40x30/${cc}.png 2x`}
    width="20"
    height="15"
    loading="lazy"
    alt={langLabel(lang ?? undefined)}
    title={langLabel(lang ?? undefined)}
  />
{/if}

<style>
  .flag-img {
    border-radius: 2px;
    vertical-align: -2px;
    margin-right: 5px;
  }
</style>
