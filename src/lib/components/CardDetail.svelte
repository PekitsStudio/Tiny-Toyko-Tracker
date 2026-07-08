<script lang="ts">
  import { detail } from '$lib/stores/detail.svelte';
  import { fmt, GAME_LABEL } from '$lib/format';
  import Flag from './Flag.svelte';

  const c = $derived(detail.card);
  function close() { detail.close(); }
  function onkey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
</script>

<svelte:window onkeydown={onkey} />

{#if c}
  <div class="ov" onclick={close} role="presentation">
    <div class="dlg" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
      <button class="x" onclick={close} aria-label="Schließen">✕</button>
      <div class="body">
        {#if c.imageUrl}
          <img class="big" src={c.imageUrl} alt={c.name} />
        {:else}
          <div class="big ph">kein Bild</div>
        {/if}
        <div class="info">
          <span class="tag {c.game}">{GAME_LABEL[c.game] ?? c.game}</span>
          <h2>{c.name}</h2>
          <div class="line"><Flag lang={c.lang} />{c.setName ?? ''}{#if c.number} · {c.number}{/if}</div>
          {#if c.rarity}<div class="muted">{c.rarity}</div>{/if}
          {#if c.condition}<div class="muted">Zustand: {c.condition}{#if c.quantity} · ×{c.quantity}{/if}</div>{/if}
          <div class="prices">
            {#if c.price != null}<div class="big-price">{fmt(c.price, c.currency ?? 'EUR')}</div>{/if}
            {#if c.priceLow != null}<div class="muted">Ab {fmt(c.priceLow, c.currency ?? 'EUR')}</div>{/if}
            {#if c.priceTrend != null}<div class="muted">Trend {fmt(c.priceTrend, c.currency ?? 'EUR')}</div>{/if}
          </div>
          {#if c.cardmarketUrl}
            <a href={c.cardmarketUrl} target="_blank" rel="noopener" class="cm">Auf Cardmarket ansehen ↗</a>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .ov { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
  .dlg { position: relative; background: var(--surface, #171a23); border: 1px solid #2a2f3a;
    border-radius: 16px; max-width: 640px; width: 100%; max-height: 90vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
  .x { position: absolute; top: 10px; right: 10px; width: 34px; height: 34px; border-radius: 999px;
    border: 1px solid #2a2f3a; background: rgba(0,0,0,0.3); color: inherit; cursor: pointer; font-size: 15px; z-index: 2; }
  .body { display: flex; gap: 20px; padding: 22px; flex-wrap: wrap; }
  .big { width: 220px; max-width: 45vw; aspect-ratio: 5/7; object-fit: contain; background: #0a0c10; border-radius: 10px; }
  .big.ph { display: flex; align-items: center; justify-content: center; color: var(--muted); }
  .info { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 8px; }
  .info h2 { margin: 4px 0; font-size: 1.35rem; }
  .line { display: flex; align-items: center; color: var(--muted); }
  .muted { color: var(--muted, #9aa0ad); font-size: 0.9rem; }
  .prices { margin-top: 8px; }
  .big-price { color: var(--gold, #f5c451); font-weight: 800; font-size: 1.5rem; }
  .cm { margin-top: 10px; color: var(--accent, #6366f1); text-decoration: none; }
</style>
