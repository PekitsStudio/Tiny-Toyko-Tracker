<script lang="ts">
  import { onMount } from 'svelte';
  import { listSold, unsellCard } from '$lib/services/collection.service';
  import { listSoldSealed, unsellSealed } from '$lib/services/extras.service';
  import { fmt, GAME_LABEL } from '$lib/format';
  import Flag from '$lib/components/Flag.svelte';
  import { detail } from '$lib/stores/detail.svelte';
  import CardFilter from '$lib/components/CardFilter.svelte';
  import { applyFilter, gameCounts, defaultFilter, type FilterFields } from '$lib/features/collection/filter';

  type SoldEntry = {
    key: string; kind: 'card' | 'sealed'; id: number; game: string; name: string;
    set_name: string | null; sub: string | null; image_url: string | null; language: string | null;
    quantity: number; currency: string | null; purchase_price: number | null; sold_price: number | null; sold_date: string | null;
  };

  let items = $state<SoldEntry[]>([]);
  let status = $state(''); let loading = $state(false); let busy = $state<string | null>(null);

  const getF = (c: SoldEntry): FilterFields => ({ game: c.game, name: c.name, set: c.sub ?? c.set_name, price: c.sold_price, date: c.sold_date });
  let filter = $state(defaultFilter('newest'));
  const games = $derived(gameCounts(items, getF));
  const shown = $derived(applyFilter(items, filter, getF));

  async function load() {
    loading = true; status = '';
    try {
      const [cards, sealed] = await Promise.all([listSold(), listSoldSealed().catch(() => [])]);
      const a: SoldEntry[] = cards.map((c) => ({
        key: 'c' + c.id, kind: 'card', id: c.id, game: c.game, name: c.name, set_name: c.set_name, sub: null,
        image_url: c.image_url, language: c.language, quantity: c.quantity ?? 1, currency: c.currency,
        purchase_price: c.purchase_price, sold_price: c.sold_price, sold_date: c.sold_date
      }));
      const b: SoldEntry[] = sealed.map((s) => ({
        key: 's' + s.id, kind: 'sealed', id: s.id, game: s.game, name: s.name, set_name: s.set_name, sub: s.product_type,
        image_url: null, language: null, quantity: s.quantity ?? 1, currency: s.currency,
        purchase_price: s.purchase_price, sold_price: s.sold_price, sold_date: s.sold_date
      }));
      items = [...a, ...b].sort((x, y) => String(y.sold_date ?? '').localeCompare(String(x.sold_date ?? '')));
      if (!items.length) status = 'Noch keine verkauften Karten oder Produkte.';
    }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(load);
  let seenTick = detail.savedTick;
  $effect(() => { if (detail.savedTick !== seenTick) { seenTick = detail.savedTick; load(); } });

  const proceeds = $derived(items.reduce((s, c) => s + (c.sold_price ?? 0) * (c.quantity ?? 1), 0));
  const realized = $derived(items.reduce((s, c) => s + ((c.sold_price ?? 0) - (c.purchase_price ?? 0)) * (c.quantity ?? 1), 0));

  async function undo(c: SoldEntry) {
    if (!confirm(`„${c.name}" zurück in die Sammlung?`)) return;
    busy = c.key;
    try {
      if (c.kind === 'card') await unsellCard(c.id); else await unsellSealed(c.id);
      items = items.filter((x) => x.key !== c.key);
    }
    catch (e) { status = (e as Error).message; } finally { busy = null; }
  }
</script>

<div class="coll-head">
  <div><h2>Verkauft</h2><div class="muted">{items.length} verkauft · Erlös {fmt(proceeds)} · Gewinn/Verlust {fmt(realized)}</div></div>
  <button class="ghost" onclick={load} disabled={loading}>{loading ? '…' : 'Aktualisieren'}</button>
</div>
{#if status}<div class="hint">{status}</div>{/if}
{#if items.length}
  <CardFilter bind:state={filter} {games} sorts={['newest', 'oldest', 'price_desc', 'price_asc', 'name']} total={items.length} shown={shown.length} />
{/if}
{#if items.length && !shown.length}<div class="hint">Keine Einträge passen zu Suche/Filter.</div>{/if}
<div class="grid">
  {#each shown as c (c.key)}
    <div class="card" class:busy={busy === c.key}>
      <span class="tag {c.game}">{GAME_LABEL[c.game] ?? c.game}</span>
      {#if c.image_url}<img src={c.image_url} alt="" loading="lazy" />{:else}<div class="ph">{c.kind === 'sealed' ? '📦' : 'kein Bild'}</div>{/if}
      <div class="meta">
        <div class="name">{c.name}</div>
        <div class="set"><Flag lang={c.language} />{c.sub ?? c.set_name ?? ''}</div>
        <div class="price">{c.sold_price != null ? fmt(c.sold_price, c.currency ?? 'EUR') : '—'}{#if c.quantity > 1} · ×{c.quantity}{/if}</div>
        {#if c.purchase_price != null && c.sold_price != null}
          <div class="pl" class:pos={(c.sold_price - c.purchase_price) >= 0}>
            {(c.sold_price - c.purchase_price) >= 0 ? '+' : ''}{fmt((c.sold_price - c.purchase_price) * (c.quantity ?? 1), c.currency ?? 'EUR')}
          </div>
        {/if}
        {#if c.sold_date}<div class="date">verkauft {c.sold_date}</div>{/if}
      </div>
      <div class="card-actions"><button class="undo" onclick={() => undo(c)} disabled={busy === c.key}>Zurück in Sammlung</button></div>
    </div>
  {/each}
</div>
<style>
  .coll-head { display: flex; align-items: center; justify-content: space-between; margin: 8px 0 16px; gap: 12px; flex-wrap: wrap; }
  .coll-head h2 { margin: 0; } .muted { color: var(--muted, #9aa0ad); font-size: 14px; }
  .coll-head button { padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; }
  .card.busy { opacity: 0.55; pointer-events: none; }
  .pl { font-size: 0.78rem; color: #fca5a5; font-weight: 700; }
  .pl.pos { color: #86efac; }
  .date { font-size: 0.7rem; color: var(--muted); }
  .card-actions .undo { flex: 1; padding: 8px; background: transparent; border: 0; border-top: 1px solid var(--border, #2a2f3a); color: var(--accent, #6366f1); cursor: pointer; font-size: 0.8rem; }
</style>
