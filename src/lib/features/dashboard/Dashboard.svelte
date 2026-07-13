<script lang="ts">
  import { onMount } from 'svelte';
  import { listCards, listWishlist, type CollectionCard } from '$lib/services/collection.service';
  import { auth } from '$lib/stores/auth.svelte';
  import { nav } from '$lib/stores/nav.svelte';
  import { fmt, GAME_LABEL } from '$lib/format';
  import { detail } from '$lib/stores/detail.svelte';

  let value = $state(0); let cardCount = $state(0); let wishCount = $state(0); let offerCount = $state(0);
  let top = $state<CollectionCard[]>([]);
  let loading = $state(false); let err = $state('');

  async function load() {
    loading = true; err = '';
    try {
      const cards = await listCards();
      cardCount = cards.reduce((s, c) => s + (c.quantity ?? 1), 0);
      value = cards.reduce((s, c) => s + (c.price_current ?? 0) * (c.quantity ?? 1), 0);
      offerCount = cards.filter((c) => c.for_sale).length;
      top = [...cards].sort((a, b) => (b.price_current ?? 0) - (a.price_current ?? 0)).slice(0, 6);
      const w = await listWishlist();
      wishCount = w.length;
    } catch (e) {
      const m = (e as Error).message;
      err = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden, um dein Dashboard zu sehen.' : m;
    } finally { loading = false; }
  }
  onMount(load);

  function openDetail(c: CollectionCard) {
    detail.open({ game: c.game, name: c.name, imageUrl: c.image_url, setName: c.set_name, number: c.number, rarity: c.rarity, lang: c.language, price: c.price_current, currency: c.currency, condition: c.condition, quantity: c.quantity, cardId: c.id, notes: c.notes, forSale: c.for_sale, askingPrice: c.asking_price });
  }
</script>

<h1 class="greet">Willkommen zurück 👋</h1>

{#if err}<div class="hint">{err}</div>{/if}
{#if loading}<div class="hint">Lädt…</div>{/if}

{#if !err}
  <div class="stats">
    <button class="stat big" onclick={() => nav.go('sammlung')}>
      <div class="label">Sammlungswert</div>
      <div class="num gold">{fmt(value)}</div>
      <div class="sub">{cardCount} Karten</div>
    </button>
    <button class="stat" onclick={() => nav.go('sammlung')}>
      <div class="label">Wunschliste</div>
      <div class="num">{wishCount}</div>
    </button>
    <button class="stat" onclick={() => nav.go('marktplatz')}>
      <div class="label">Deine Angebote</div>
      <div class="num">{offerCount}</div>
    </button>
    <button class="stat" onclick={() => nav.go('suche')}>
      <div class="label">Karten finden</div>
      <div class="num">＋</div>
      <div class="sub">Zur Suche</div>
    </button>
  </div>

  {#if top.length}
    <h2 class="th">Wertvollste Karten</h2>
    <div class="grid">
      {#each top as c (c.id)}
        <div class="card">
          <span class="tag {c.game}">{GAME_LABEL[c.game] ?? c.game}</span>
          {#if c.image_url}<img src={c.image_url} alt="" loading="lazy" style="cursor:zoom-in" onclick={() => openDetail(c)} />{:else}<div class="ph">kein Bild</div>{/if}
          <div class="meta">
            <div class="name">{c.name}</div>
            <div class="price">{c.price_current != null ? fmt(c.price_current, c.currency ?? 'EUR') : 'kein Preis'}</div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
{/if}

<style>
  .greet { margin: 8px 0 18px; font-size: 1.6rem; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 26px; }
  .stat { text-align: left; background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 14px; padding: 16px; cursor: pointer; color: inherit; transition: border-color 0.15s, transform 0.15s; }
  .stat:hover { border-color: var(--accent, #6366f1); transform: translateY(-2px); }
  .stat.big { grid-column: span 2; }
  .label { color: var(--muted, #9aa0ad); font-size: 0.82rem; }
  .num { font-size: 1.9rem; font-weight: 800; margin-top: 4px; }
  .num.gold { color: var(--gold, #f5c451); }
  .sub { color: var(--muted); font-size: 0.8rem; margin-top: 2px; }
  .th { margin: 8px 0 12px; font-size: 1.1rem; }
  @media (max-width: 520px) { .stat.big { grid-column: span 1; } }
</style>
