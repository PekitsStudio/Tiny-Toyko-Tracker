<script lang="ts">
  import { GAME_LABEL, fmt, refText, extraLine } from '$lib/format';
  import Flag from '$lib/components/Flag.svelte';
  import type { SearchCard } from '$lib/types';

  let { cards = [], onadd, onquick, onwish, ondetail }:
    {
      cards?: SearchCard[];
      onadd?: (c: SearchCard) => void; onquick?: (c: SearchCard) => void;
      onwish?: (c: SearchCard) => void; ondetail?: (c: SearchCard) => void;
    } = $props();

  function priceLabel(c: SearchCard): string {
    return c.currency === 'USD' ? 'TCG $' : (c.game === 'pokemon' ? '30T' : 'CM');
  }
  function subPrice(c: SearchCard): string {
    const parts: string[] = [];
    if (c.priceLow != null) parts.push(`Ab ${fmt(c.priceLow, c.currency)}`);
    if (c.priceTrend != null) parts.push(`Trend ${fmt(c.priceTrend, c.currency)}`);
    return parts.join(' · ');
  }
</script>

<div class="grid">
  {#each cards as c}
    <div class="card">
      <span class="tag {c.game}">{GAME_LABEL[c.game]}</span>
      {#if c.imageUrl}
        <img src={c.imageUrl} alt="" loading="lazy" title="Details ansehen" onclick={() => ondetail?.(c)} />
      {:else}
        <div class="ph">kein Bild</div>
      {/if}
      <div class="meta">
        <div class="name">{c.name}</div>
        <div class="set"><Flag lang={c.lang} />{c.setName || ''}</div>
        {#if refText(c)}<div class="ref"><b>{refText(c)}</b></div>{/if}
        {#if c.rarity}<div class="rarity">{c.rarity}</div>{/if}
        {#if extraLine(c)}<div class="extra">{extraLine(c)}</div>{/if}
        {#if c.cardmarketPrice != null}
          <div class="price">{fmt(c.cardmarketPrice, c.currency)} <small>{priceLabel(c)}</small></div>
        {:else if c.needsDetail}
          <div class="price none">Preis lädt…</div>
        {:else}
          <div class="price none">kein Preis</div>
        {/if}
        {#if subPrice(c)}<div class="subprice">{subPrice(c)}</div>{/if}
        {#if c.cardmarketUrl}
          <a href={c.cardmarketUrl} target="_blank" rel="noopener" class="cm-link">Cardmarket ↗</a>
        {/if}
      </div>
      <div class="card-actions">
        <button class="add" title="Sofort hinzufügen" onclick={() => onquick?.(c)}>⚡+1</button>
        <button class="add" onclick={() => onadd?.(c)}>+ Sammlung</button>
        <button class="wish" title="Auf die Wunschliste" onclick={() => onwish?.(c)}>♡</button>
      </div>
    </div>
  {/each}
</div>
