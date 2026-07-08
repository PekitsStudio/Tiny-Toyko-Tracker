<script lang="ts">
  import { langLabel } from '$lib/format';
  let { lang }: { lang?: string | null } = $props();
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
    src={`https://flagcdn.com/16x12/${cc}.png`}
    srcset={`https://flagcdn.com/32x24/${cc}.png 2x`}
    alt={langLabel(lang ?? undefined)}
    title={langLabel(lang ?? undefined)}
  />
{/if}

<style>
  /* fest klein halten und gegen globale .card-img-Regeln absichern */
  .flag-img {
    display: inline-block;
    width: 16px;
    height: 12px;
    aspect-ratio: auto;
    object-fit: cover;
    background: none;
    vertical-align: middle;
    margin-right: 5px;
    border-radius: 2px;
  }
</style>
