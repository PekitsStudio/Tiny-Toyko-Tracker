<script lang="ts">
  import { onMount } from 'svelte';
  import { listMarket, type MarketCard } from '$lib/services/market.service';
  import { fmt, GAME_LABEL } from '$lib/format';
  import Flag from '$lib/components/Flag.svelte';
  import { detail } from '$lib/stores/detail.svelte';

  const GAMES = [
    { id: '', label: 'Alle' }, { id: 'pokemon', label: 'Pokémon' }, { id: 'magic', label: 'Magic' },
    { id: 'yugioh', label: 'Yu-Gi-Oh' }, { id: 'onepiece', label: 'One Piece' }
  ];
  let game = $state(''); let q = $state('');
  let items = $state<MarketCard[]>([]); let status = $state(''); let loading = $state(false);

  async function load() {
    loading = true; status = '';
    try { items = await listMarket({ game, q }); if (!items.length) status = 'Keine Angebote gefunden.'; }
    catch (e) { status = (e as Error).message; }
    finally { loading = false; }
  }
  onMount(load);

  function openDetail(m: MarketCard) {
    detail.open({
      game: m.game, name: m.name, imageUrl: m.image_url, setName: m.set_name, number: m.number,
      rarity: m.rarity, lang: m.language, price: m.asking_price, currency: m.currency,
      cardmarketUrl: m.cardmarket_url, condition: m.condition
    });
  }
</script>

<div class="coll-head"><div><h2>Marktplatz</h2><div class="muted">{items.length} Angebote</div></div></div>

<div class="mkt-filter">
  {#each GAMES as g}
    <button class="chip" class:active={game === g.id} onclick={() => { game = g.id; load(); }}>{g.label}</button>
  {/each}
  <input placeholder="Name suchen…" bind:value={q} onkeydown={(e) => { if (e.key === 'Enter') load(); }} />
  <button class="ghost" onclick={load} disabled={loading}>{loading ? '…' : 'Suchen'}</button>
</div>

{#if status}<div class="hint">{status}</div>{/if}

<div class="grid">
  {#each items as m (m.id)}
    <div class="card">
      <span class="tag {m.game}">{GAME_LABEL[m.game] ?? m.game}</span>
      {#if m.image_url}
        <img src={m.image_url} alt="" loading="lazy" style="cursor:zoom-in" onclick={() => openDetail(m)} />
      {:else}<div class="ph">kein Bild</div>{/if}
      <div class="meta">
        <div class="name">{m.name}</div>
        <div class="set"><Flag lang={m.language} />{m.set_name ?? ''}{#if m.condition} · {m.condition}{/if}</div>
        <div class="price">{m.asking_price != null ? fmt(m.asking_price, m.currency ?? 'EUR') : 'VB'}</div>
        <div class="seller">von {m.seller_name ?? 'Sammler'}{m.is_mine ? ' (du)' : ''}</div>
        {#if m.seller_contact}<div class="contact">Kontakt: {m.seller_contact}</div>{/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .coll-head { display: flex; align-items: center; justify-content: space-between; margin: 8px 0 12px; }
  .coll-head h2 { margin: 0; } .muted { color: var(--muted, #9aa0ad); font-size: 14px; }
  .mkt-filter { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
  .mkt-filter .chip { padding: 7px 14px; border-radius: 999px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; font-size: 0.85rem; }
  .mkt-filter .chip.active { background: var(--accent, #6366f1); border-color: transparent; color: #fff; }
  .mkt-filter input { padding: 8px 11px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: inherit; }
  .mkt-filter .ghost { padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; }
  .seller { font-size: 0.72rem; color: var(--muted); margin-top: 2px; }
  .contact { font-size: 0.72rem; color: var(--accent, #6366f1); }
</style>
