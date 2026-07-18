<script lang="ts">
  import { onMount } from 'svelte';
  import { listWishlist, deleteWishlist, type WishlistItem } from '$lib/services/collection.service';
  import { fmt, GAME_LABEL } from '$lib/format';
  import Flag from '$lib/components/Flag.svelte';
  import { detail } from '$lib/stores/detail.svelte';
  import CardFilter from '$lib/components/CardFilter.svelte';
  import { applyFilter, gameCounts, defaultFilter, type FilterFields } from '$lib/features/collection/filter';

  let items = $state<WishlistItem[]>([]);
  let status = $state(''); let loading = $state(false); let busy = $state<number | null>(null);

  const getF = (w: WishlistItem): FilterFields => ({ game: w.game, name: w.name, set: w.set_name, rarity: w.rarity, number: w.number, price: w.price_current });
  let filter = $state(defaultFilter('name'));
  const games = $derived(gameCounts(items, getF));
  const shown = $derived(applyFilter(items, filter, getF));

  async function load() {
    loading = true; status = '';
    try { items = await listWishlist(); if (!items.length) status = 'Deine Wunschliste ist noch leer.'; }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte zuerst oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(load);

  // Nach dem Speichern im Detail-Modal (z. B. "öffentlich suchen") neu laden
  let seenTick = detail.savedTick;
  $effect(() => { if (detail.savedTick !== seenTick) { seenTick = detail.savedTick; load(); } });

  async function remove(w: WishlistItem) {
    if (!confirm(`„${w.name}" von der Wunschliste entfernen?`)) return;
    busy = w.id;
    try { await deleteWishlist(w.id); items = items.filter((x) => x.id !== w.id); }
    catch (e) { status = (e as Error).message; } finally { busy = null; }
  }
  function openDetail(w: WishlistItem) {
    detail.open({
      game: w.game, name: w.name, imageUrl: w.image_url, setName: w.set_name, number: w.number,
      rarity: w.rarity, lang: w.language, price: w.price_current, priceLow: w.price_low,
      priceTrend: w.price_trend, currency: w.currency, cardmarketUrl: w.cardmarket_url,
      wishlistId: w.id, seeking: w.seeking, seekMaxPrice: w.seek_max_price, externalId: w.external_id ?? undefined
    });
  }
</script>

<div class="coll-head"><div><h2>Wunschliste</h2><div class="muted">{items.length} Karten</div></div>
  <button class="ghost" onclick={load} disabled={loading}>{loading ? '…' : 'Aktualisieren'}</button></div>
{#if status}<div class="hint">{status}</div>{/if}
{#if items.length}
  <CardFilter bind:state={filter} {games} sorts={['name', 'price_desc', 'price_asc']} total={items.length} shown={shown.length} />
{/if}
{#if items.length && !shown.length}<div class="hint">Keine Karten passen zu Suche/Filter.</div>{/if}
<div class="grid">
  {#each shown as w (w.id)}
    <div class="card" class:busy={busy === w.id}>
      <span class="tag {w.game}">{GAME_LABEL[w.game] ?? w.game}</span>
      {#if w.image_url}<img src={w.image_url} alt="" loading="lazy" style="cursor:zoom-in" onclick={() => openDetail(w)} />{:else}<div class="ph">kein Bild</div>{/if}
      <div class="meta">
        <div class="name">{w.name}</div>
        <div class="set"><Flag lang={w.language} />{w.set_name ?? ''}</div>
        {#if w.rarity}<div class="rarity">{w.rarity}</div>{/if}
        <div class="price">{w.price_current != null ? fmt(w.price_current, w.currency ?? 'EUR') : 'kein Preis'}</div>
        {#if w.seeking}<div class="seeking">🔎 wird gesucht{#if w.seek_max_price != null} · bis {fmt(w.seek_max_price, w.seek_currency ?? 'EUR')}{/if}</div>{/if}
      </div>
      <div class="card-actions">
        <button class="add" onclick={() => openDetail(w)}>Details</button>
        <button class="del" onclick={() => remove(w)} disabled={busy === w.id} title="Entfernen">✕</button>
      </div>
    </div>
  {/each}
</div>
<style>
  .coll-head { display: flex; align-items: center; justify-content: space-between; margin: 8px 0 16px; }
  .coll-head h2 { margin: 0; } .muted { color: var(--muted, #9aa0ad); font-size: 14px; }
  .coll-head button { padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; }
  .card.busy { opacity: 0.55; pointer-events: none; } .card-actions .del { color: #fca5a5; }
  .seeking { font-size: 0.72rem; color: var(--accent, #6366f1); margin-top: 2px; }
</style>
