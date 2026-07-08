<script lang="ts">
  import { onMount } from 'svelte';
  import { listTrades, updateTrade, type Trade, type TradeStatus } from '$lib/services/trade.service';
  import { fmt } from '$lib/format';

  let trades = $state<Trade[]>([]);
  let status = $state(''); let loading = $state(false); let busy = $state<number | null>(null);

  async function load() {
    loading = true; status = '';
    try { trades = await listTrades(); if (!trades.length) status = 'Noch keine Trades.'; }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(load);

  async function act(id: number, fields: Parameters<typeof updateTrade>[1]) {
    busy = id;
    try { await updateTrade(id, fields); await load(); }
    catch (e) { status = (e as Error).message; }
    finally { busy = null; }
  }

  function myDone(t: Trade) { return t.i_am_proposer ? t.proposer_done : t.responder_done; }
  function partnerName(t: Trade) { return t.i_am_proposer ? (t.responder_name ?? 'Verkäufer') : (t.proposer_name ?? 'Käufer'); }
  const LABEL: Record<TradeStatus, string> = { angefragt: 'angefragt', angenommen: 'angenommen', abgelehnt: 'abgelehnt', abgebrochen: 'abgebrochen', abgeschlossen: 'abgeschlossen' };
</script>

<div class="coll-head">
  <div><h2>Handel</h2><div class="muted">{trades.length} Trades</div></div>
  <button class="ghost" onclick={load} disabled={loading}>{loading ? '…' : 'Aktualisieren'}</button>
</div>
{#if status}<div class="hint">{status}</div>{/if}

<div class="tlist">
  {#each trades as t (t.id)}
    <div class="trow" class:busy={busy === t.id}>
      <div class="tmain">
        <div class="tname">{t.card_name}</div>
        <div class="tsub">
          {t.i_am_proposer ? 'Kauf von' : 'Verkauf an'} <b>{partnerName(t)}</b>
          {#if t.price != null} · {fmt(t.price, t.currency ?? 'EUR')}{/if}
          · <span class="badge {t.status}">{LABEL[t.status]}</span>
        </div>
        {#if t.message}<div class="tmsg">„{t.message}"</div>{/if}
      </div>
      <div class="tactions">
        {#if t.status === 'angefragt'}
          {#if t.i_am_proposer}
            <span class="wait">Warte auf Verkäufer…</span>
            <button class="danger" onclick={() => act(t.id, { status: 'abgebrochen' })} disabled={busy === t.id}>Zurückziehen</button>
          {:else}
            <button class="ok" onclick={() => act(t.id, { status: 'angenommen' })} disabled={busy === t.id}>Annehmen</button>
            <button class="danger" onclick={() => act(t.id, { status: 'abgelehnt' })} disabled={busy === t.id}>Ablehnen</button>
          {/if}
        {:else if t.status === 'angenommen'}
          {#if myDone(t)}
            <span class="wait">✓ bestätigt, warte auf {partnerName(t)}…</span>
          {:else}
            <button class="ok" onclick={() => act(t.id, t.i_am_proposer ? { proposer_done: true } : { responder_done: true })} disabled={busy === t.id}>
              {t.i_am_proposer ? 'Kauf bestätigen' : 'Verkauf bestätigen'}
            </button>
          {/if}
          <button class="danger" onclick={() => act(t.id, { status: 'abgebrochen' })} disabled={busy === t.id}>Abbrechen</button>
        {:else if t.status === 'abgeschlossen'}
          <span class="done">✓ Abgeschlossen — Karte übertragen</span>
        {:else}
          <span class="muted">{LABEL[t.status]}</span>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .coll-head { display: flex; align-items: center; justify-content: space-between; margin: 8px 0 16px; gap: 12px; flex-wrap: wrap; }
  .coll-head h2 { margin: 0; } .muted { color: var(--muted, #9aa0ad); font-size: 14px; }
  .coll-head button { padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; }
  .tlist { display: flex; flex-direction: column; gap: 10px; }
  .trow { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 14px 16px; }
  .trow.busy { opacity: 0.55; pointer-events: none; }
  .tname { font-weight: 600; }
  .tsub { color: var(--muted); font-size: 0.85rem; margin-top: 2px; }
  .tmsg { color: var(--muted); font-size: 0.8rem; margin-top: 4px; font-style: italic; }
  .badge { padding: 2px 9px; border-radius: 999px; font-size: 0.72rem; border: 1px solid #2a2f3a; }
  .badge.angefragt { color: #f5c451; } .badge.angenommen { color: #6366f1; }
  .badge.abgeschlossen { color: #86efac; } .badge.abgelehnt, .badge.abgebrochen { color: #fca5a5; }
  .tactions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .tactions button { padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; font-weight: 600; }
  .tactions .ok { background: var(--accent, #6366f1); border-color: transparent; color: #fff; }
  .tactions .danger { color: #fca5a5; }
  .wait { color: var(--muted); font-size: 0.85rem; }
  .done { color: #86efac; font-size: 0.85rem; font-weight: 600; }
</style>
