<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listCards,
    deleteCard,
    setCardQuantity,
    type CollectionCard
  } from '$lib/services/collection.service';
  import { fmt, flagFor, GAME_LABEL } from '$lib/format';

  let cards = $state<CollectionCard[]>([]);
  let status = $state('');
  let loading = $state(false);
  let busy = $state<number | null>(null); // id der Karte, die gerade aktualisiert wird

  async function load() {
    loading = true;
    status = '';
    try {
      cards = await listCards();
      if (!cards.length) status = 'Deine Sammlung ist noch leer.';
    } catch (e) {
      const m = (e as Error).message;
      status = m === 'Nicht eingeloggt' ? 'Bitte zuerst oben anmelden.' : m;
    } finally {
      loading = false;
    }
  }
  onMount(load);

  const total = $derived(cards.reduce((s, c) => s + (c.price_current ?? 0) * (c.quantity ?? 1), 0));
  const count = $derived(cards.reduce((s, c) => s + (c.quantity ?? 1), 0));

  async function changeQty(c: CollectionCard, delta: number) {
    const q = Math.max(1, (c.quantity ?? 1) + delta);
    if (q === c.quantity) return;
    busy = c.id;
    try {
      await setCardQuantity(c.id, q);
      c.quantity = q;
      cards = [...cards];
    } catch (e) {
      status = (e as Error).message;
    } finally {
      busy = null;
    }
  }

  async function remove(c: CollectionCard) {
    if (!confirm(`„${c.name}" wirklich aus der Sammlung entfernen?`)) return;
    busy = c.id;
    try {
      await deleteCard(c.id);
      cards = cards.filter((x) => x.id !== c.id);
    } catch (e) {
      status = (e as Error).message;
    } finally {
      busy = null;
    }
  }
</script>

<div class="coll-head">
  <div>
    <h2>Deine Sammlung</h2>
    <div class="muted">{count} Karten · Wert {fmt(total)}</div>
  </div>
  <button class="ghost" onclick={load} disabled={loading}>{loading ? '…' : 'Aktualisieren'}</button>
</div>

{#if status}<div class="hint">{status}</div>{/if}

<div class="grid">
  {#each cards as c (c.id)}
    <div class="card" class:busy={busy === c.id}>
      <span class="tag {c.game}">{GAME_LABEL[c.game] ?? c.game}</span>
      {#if c.image_url}
        <img src={c.image_url} alt="" loading="lazy" />
      {:else}
        <div class="ph">kein Bild</div>
      {/if}
      <div class="meta">
        <div class="name">{c.name}</div>
        <div class="set"><span class="flag">{flagFor(c.language ?? undefined)}</span>{c.set_name ?? ''}</div>
        {#if c.rarity}<div class="rarity">{c.rarity}</div>{/if}
        <div class="price">
          {c.price_current != null ? fmt(c.price_current, c.currency ?? 'EUR') : 'kein Preis'}
        </div>
      </div>
      <div class="card-actions">
        <button title="weniger" onclick={() => changeQty(c, -1)} disabled={busy === c.id || (c.quantity ?? 1) <= 1}>−</button>
        <span class="qty">×{c.quantity ?? 1}</span>
        <button title="mehr" onclick={() => changeQty(c, 1)} disabled={busy === c.id}>+</button>
        <button class="del" title="Entfernen" onclick={() => remove(c)} disabled={busy === c.id}>✕</button>
      </div>
    </div>
  {/each}
</div>

<style>
  .coll-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 8px 0 16px;
  }
  .coll-head h2 {
    margin: 0;
  }
  .muted {
    color: var(--muted, #9aa0ad);
    font-size: 14px;
  }
  .coll-head button {
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid #2a2f3a;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  .card.busy {
    opacity: 0.55;
    pointer-events: none;
  }
  .card-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px;
  }
  .card-actions button {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: 1px solid #2a2f3a;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
  }
  .card-actions .qty {
    min-width: 34px;
    text-align: center;
    font-weight: 600;
  }
  .card-actions .del {
    margin-left: auto;
    color: #fca5a5;
    border-color: #3a1620;
  }
</style>
