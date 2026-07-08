<script lang="ts">
  import { onMount } from 'svelte';
  import { listCards, type CollectionCard } from '$lib/services/collection.service';
  import { fmt, flagFor, GAME_LABEL } from '$lib/format';

  let cards = $state<CollectionCard[]>([]);
  let status = $state('');
  let loading = $state(false);

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
    <div class="card">
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
          {c.price_current != null ? fmt(c.price_current, c.currency ?? 'EUR') : 'kein Preis'}{#if c.quantity > 1}
            · ×{c.quantity}{/if}
        </div>
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
</style>
