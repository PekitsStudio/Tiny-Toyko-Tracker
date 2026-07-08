<script lang="ts">
  import { onMount } from 'svelte';
  import { listSold, unsellCard, type SoldCard } from '$lib/services/collection.service';
  import { fmt, GAME_LABEL } from '$lib/format';
  import Flag from '$lib/components/Flag.svelte';
  import { detail } from '$lib/stores/detail.svelte';

  let items = $state<SoldCard[]>([]);
  let status = $state(''); let loading = $state(false); let busy = $state<number | null>(null);

  async function load() {
    loading = true; status = '';
    try { items = await listSold(); if (!items.length) status = 'Noch keine verkauften Karten.'; }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(load);
  let seenTick = detail.savedTick;
  $effect(() => { if (detail.savedTick !== seenTick) { seenTick = detail.savedTick; load(); } });

  const proceeds = $derived(items.reduce((s, c) => s + (c.sold_price ?? 0) * (c.quantity ?? 1), 0));
  const realized = $derived(items.reduce((s, c) => s + ((c.sold_price ?? 0) - (c.purchase_price ?? 0)) * (c.quantity ?? 1), 0));

  async function undo(c: SoldCard) {
    if (!confirm(`„${c.name}" zurück in die Sammlung?`)) return;
    busy = c.id;
    try { await unsellCard(c.id); items = items.filter((x) => x.id !== c.id); }
    catch (e) { status = (e as Error).message; } finally { busy = null; }
  }
</script>

<div class="coll-head">
  <div><h2>Verkauft</h2><div class="muted">{items.length} Karten · Erlös {fmt(proceeds)} · Gewinn/Verlust {fmt(realized)}</div></div>
  <button class="ghost" onclick={load} disabled={loading}>{loading ? '…' : 'Aktualisieren'}</button>
</div>
{#if status}<div class="hint">{status}</div>{/if}
<div class="grid">
  {#each items as c (c.id)}
    <div class="card" class:busy={busy === c.id}>
      <span class="tag {c.game}">{GAME_LABEL[c.game] ?? c.game}</span>
      {#if c.image_url}<img src={c.image_url} alt="" loading="lazy" />{:else}<div class="ph">kein Bild</div>{/if}
      <div class="meta">
        <div class="name">{c.name}</div>
        <div class="set"><Flag lang={c.language} />{c.set_name ?? ''}</div>
        <div class="price">{c.sold_price != null ? fmt(c.sold_price, c.currency ?? 'EUR') : '—'}{#if c.quantity > 1} · ×{c.quantity}{/if}</div>
        {#if c.purchase_price != null && c.sold_price != null}
          <div class="pl" class:pos={(c.sold_price - c.purchase_price) >= 0}>
            {(c.sold_price - c.purchase_price) >= 0 ? '+' : ''}{fmt((c.sold_price - c.purchase_price) * (c.quantity ?? 1), c.currency ?? 'EUR')}
          </div>
        {/if}
        {#if c.sold_date}<div class="date">verkauft {c.sold_date}</div>{/if}
      </div>
      <div class="card-actions"><button class="undo" onclick={() => undo(c)} disabled={busy === c.id}>Zurück in Sammlung</button></div>
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
