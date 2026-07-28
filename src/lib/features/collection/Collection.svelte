<script lang="ts">
  import { onMount } from 'svelte';
  import { listCards, deleteCard, setCardQuantity, refreshCollectionPrices, type CollectionCard } from '$lib/services/collection.service';
  import { fmt, money, GAME_LABEL } from '$lib/format';
  import Flag from '$lib/components/Flag.svelte';
  import { detail } from '$lib/stores/detail.svelte';
  import CardFilter from '$lib/components/CardFilter.svelte';
  import { applyFilter, gameCounts, defaultFilter, type FilterFields } from '$lib/features/collection/filter';
  import { i18n } from '$lib/i18n.svelte';

  let cards = $state<CollectionCard[]>([]);
  let status = $state(''); let loading = $state(false); let busy = $state<number | null>(null);
  let refreshing = $state(false); let priceMsg = $state('');

  const getF = (c: CollectionCard): FilterFields => ({ game: c.game, name: c.name, set: c.set_name, rarity: c.rarity, number: c.number, price: c.price_current, date: c.purchase_date });
  let filter = $state(defaultFilter('name'));
  const games = $derived(gameCounts(cards, getF));
  const shownCards = $derived(applyFilter(cards, filter, getF));

  async function load() {
    loading = true; status = '';
    try { cards = await listCards(); if (!cards.length) status = i18n.t('coll.empty'); }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? i18n.t('common.pleaseLogin') : m; }
    finally { loading = false; }
  }
  onMount(load);

  // Nach dem Speichern im Detail-Modal die Liste neu laden
  let seenTick = detail.savedTick;
  $effect(() => {
    if (detail.savedTick !== seenTick) { seenTick = detail.savedTick; load(); }
  });

  const total = $derived.by<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const c of cards) { const cur = c.currency || 'EUR'; m[cur] = (m[cur] ?? 0) + (c.price_current ?? 0) * (c.quantity ?? 1); }
    return m;
  });
  const count = $derived(cards.reduce((s, c) => s + (c.quantity ?? 1), 0));

  async function refreshPrices() {
    refreshing = true; priceMsg = i18n.t('coll.pricesLoading');
    try {
      const { updated, total: t } = await refreshCollectionPrices((d, tt) => (priceMsg = i18n.t('coll.pricesProgress', { d, t: tt })));
      await load(); priceMsg = i18n.t('coll.pricesUpdated', { u: updated, t }); setTimeout(() => (priceMsg = ''), 3500);
    } catch (e) { priceMsg = (e as Error).message; } finally { refreshing = false; }
  }
  async function changeQty(c: CollectionCard, delta: number) {
    const q = Math.max(1, (c.quantity ?? 1) + delta); if (q === c.quantity) return;
    busy = c.id;
    try { await setCardQuantity(c.id, q); c.quantity = q; cards = [...cards]; }
    catch (e) { status = (e as Error).message; } finally { busy = null; }
  }
  async function remove(c: CollectionCard) {
    if (!confirm(i18n.t('coll.confirmRemove', { name: c.name }))) return;
    busy = c.id;
    try { await deleteCard(c.id); cards = cards.filter((x) => x.id !== c.id); }
    catch (e) { status = (e as Error).message; } finally { busy = null; }
  }
  function openDetail(c: CollectionCard) {
    detail.open({
      game: c.game, name: c.name, imageUrl: c.image_url, setName: c.set_name, number: c.number,
      rarity: c.rarity, lang: c.language, price: c.price_current, currency: c.currency,
      condition: c.condition, quantity: c.quantity, cardId: c.id, notes: c.notes, forSale: c.for_sale, askingPrice: c.asking_price, purchasePrice: c.purchase_price, purchaseDate: c.purchase_date, externalId: c.external_id ?? undefined
    });
  }
</script>

<div class="coll-head">
  <div><h2>{i18n.t('coll.title')}</h2><div class="muted">{i18n.t('coll.summary', { count, value: money(total) })}{#if priceMsg}{' · '}{priceMsg}{/if}</div></div>
  <div class="head-btns">
    <button class="primary" onclick={refreshPrices} disabled={refreshing || loading}>{refreshing ? '…' : i18n.t('coll.refreshPrices')}</button>
    <button class="ghost" onclick={load} disabled={loading || refreshing}>{loading ? '…' : i18n.t('coll.reload')}</button>
  </div>
</div>
{#if status}<div class="hint">{status}</div>{/if}
{#if cards.length}
  <CardFilter bind:state={filter} {games} sorts={['name', 'price_desc', 'price_asc']} total={cards.length} shown={shownCards.length} />
{/if}
{#if cards.length && !shownCards.length}<div class="hint">{i18n.t('coll.noFilterMatch')}</div>{/if}
<div class="grid">
  {#each shownCards as c (c.id)}
    <div class="card" class:busy={busy === c.id}>
      <span class="tag {c.game}">{GAME_LABEL[c.game] ?? c.game}</span>
      {#if c.image_url}<img src={c.image_url} alt={c.name} loading="lazy" style="cursor:zoom-in" onclick={() => openDetail(c)} />{:else}<div class="ph">{i18n.t('coll.noImage')}</div>{/if}
      <div class="meta">
        <div class="name">{c.name}</div>
        <div class="set"><Flag lang={c.language} />{c.set_name ?? ''}</div>
        {#if c.rarity}<div class="rarity">{c.rarity}</div>{/if}
        <div class="price">{c.price_current != null ? fmt(c.price_current, c.currency ?? 'EUR') : i18n.t('coll.noPrice')}</div>
      </div>
      <div class="card-actions">
        <button onclick={() => changeQty(c, -1)} disabled={busy === c.id || (c.quantity ?? 1) <= 1}>−</button>
        <span class="qty">×{c.quantity ?? 1}</span>
        <button onclick={() => changeQty(c, 1)} disabled={busy === c.id}>+</button>
        <button class="del" onclick={() => remove(c)} disabled={busy === c.id}>✕</button>
      </div>
    </div>
  {/each}
</div>
<style>
  .coll-head { display: flex; align-items: center; justify-content: space-between; margin: 8px 0 16px; gap: 12px; flex-wrap: wrap; }
  .coll-head h2 { margin: 0; } .muted { color: var(--muted, #9aa0ad); font-size: 14px; }
  .head-btns { display: flex; gap: 8px; }
  .head-btns button { padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; }
  .head-btns .primary { background: var(--accent, #6366f1); border-color: transparent; color: #fff; font-weight: 600; }
  .head-btns button:disabled { opacity: 0.6; cursor: default; }
  .card.busy { opacity: 0.55; pointer-events: none; }
  .card-actions { display: flex; align-items: center; gap: 6px; padding: 8px; }
  .card-actions button { width: 30px; height: 30px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; font-size: 15px; line-height: 1; }
  .card-actions .qty { min-width: 34px; text-align: center; font-weight: 600; }
  .card-actions .del { margin-left: auto; color: #fca5a5; border-color: #3a1620; }
</style>
