<script lang="ts">
  import { onMount } from 'svelte';
  import { listWishlist, deleteWishlist, type WishlistItem } from '$lib/services/collection.service';
  import { fmt, GAME_LABEL } from '$lib/format';
  import Flag from '$lib/components/Flag.svelte';
  import { detail } from '$lib/stores/detail.svelte';

  let items = $state<WishlistItem[]>([]);
  let status = $state('');
  let loading = $state(false);
  let busy = $state<number | null>(null);

  async function load() {
    loading = true; status = '';
    try {
      items = await listWishlist();
      if (!items.length) status = 'Deine Wunschliste ist noch leer.';
    } catch (e) {
      const m = (e as Error).message;
      status = m === 'Nicht eingeloggt' ? 'Bitte zuerst oben anmelden.' : m;
    } finally { loading = false; }
  }
  onMount(load);

  async function remove(w: WishlistItem) {
    if (!confirm(`„${w.name}" von der Wunschliste entfernen?`)) return;
    busy = w.id;
    try { await deleteWishlist(w.id); items = items.filter((x) => x.id !== w.id); }
    catch (e) { status = (e as Error).message; }
    finally { busy = null; }
  }

  function openDetail(w: WishlistItem) {
    detail.open({
      game: w.game, name: w.name, imageUrl: w.image_url, setName: w.set_name, number: w.number,
      rarity: w.rarity, lang: w.language, price: w.price_current, priceLow: w.price_low,
      priceTrend: w.price_trend, currency: w.currency, cardmarketUrl: w.cardmarket_url
    });
  }
</script>

<div class="coll-head">
  <div><h2>Wunschliste</h2><div class="muted">{items.length} Karten</div></div>
  <button class="ghost" onclick={load} disabled={loading}>{loading ? '…' : 'Aktualisieren'}</button>
</div>
{#if status}<div class="hint">{status}</div>{/if}
<div class="grid">
  {#each items as w (w.id)}
    <div class="card" class:busy={busy === w.id}>
      <span class="tag {w.game}">{GAME_LABEL[w.game] ?? w.game}</span>
      {#if w.image_url}
        <img src={w.image_url} alt="" loading="lazy" style="cursor:zoom-in" onclick={() => openDetail(w)} />
      {:else}
        <div class="ph">kein Bild</div>
      {/if}
      <div class="meta">
        <div class="name">{w.name}</div>
        <div class="set"><Flag lang={w.language} />{w.set_name ?? ''}</div>
        {#if w.rarity}<div class="rarity">{w.rarity}</div>{/if}
        <div class="price">{w.price_current != null ? fmt(w.price_current, w.currency ?? 'EUR') : 'kein Preis'}</div>
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
  .coll-head h2 { margin: 0; }
  .muted { color: var(--muted, #9aa0ad); font-size: 14px; }
  .coll-head button { padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; }
  .card.busy { opacity: 0.55; pointer-events: none; }
  .card-actions .del { color: #fca5a5; }
</style>
