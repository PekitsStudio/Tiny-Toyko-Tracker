<script lang="ts">
  import { onMount } from 'svelte';
  import { listTrades, updateTrade, giveFeedback, myRatedTradeIds, type Trade, type TradeStatus } from '$lib/services/trade.service';
  import { fmt } from '$lib/format';

  let trades = $state<Trade[]>([]);
  let rated = $state<Set<number>>(new Set());
  let status = $state(''); let loading = $state(false); let busy = $state<number | null>(null);

  let ratingFor = $state<number | null>(null);
  let form = $state({ stars: 5, recommend: true, comment: '', kom: 0, verp: 0, vers: 0, zus: 0 });

  async function load() {
    loading = true; status = '';
    try {
      trades = await listTrades();
      rated = new Set(await myRatedTradeIds());
      if (!trades.length) status = 'Noch keine Trades.';
    } catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(load);

  async function act(id: number, fields: Parameters<typeof updateTrade>[1]) {
    busy = id;
    try { await updateTrade(id, fields); await load(); }
    catch (e) { status = (e as Error).message; } finally { busy = null; }
  }

  function myDone(t: Trade) { return t.i_am_proposer ? t.proposer_done : t.responder_done; }
  function partnerName(t: Trade) { return t.i_am_proposer ? (t.responder_name ?? 'Verkäufer') : (t.proposer_name ?? 'Käufer'); }
  function partnerId(t: Trade) { return t.i_am_proposer ? t.responder : t.proposer; }

  function openRating(t: Trade) { ratingFor = t.id; form = { stars: 5, recommend: true, comment: '', kom: 0, verp: 0, vers: 0, zus: 0 }; }
  async function submitRating(t: Trade) {
    busy = t.id;
    try {
      await giveFeedback(t.id, partnerId(t), {
        stars: form.stars, recommend: form.recommend, comment: form.comment || null,
        catKommunikation: form.kom || null, catVerpackung: form.verp || null, catVersand: form.vers || null, catZustand: form.zus || null
      });
      ratingFor = null; await load();
    } catch (e) { status = (e as Error).message; } finally { busy = null; }
  }

  const LABEL: Record<TradeStatus, string> = { angefragt: 'angefragt', angenommen: 'angenommen', abgelehnt: 'abgelehnt', abgebrochen: 'abgebrochen', abgeschlossen: 'abgeschlossen' };
  const CATS: [keyof typeof form, string][] = [['kom', 'Kommunikation'], ['verp', 'Verpackung'], ['vers', 'Versand'], ['zus', 'Zustand']];
</script>

<div class="coll-head">
  <div><h2>Handel</h2><div class="muted">{trades.length} Trades</div></div>
  <button class="ghost" onclick={load} disabled={loading}>{loading ? '…' : 'Aktualisieren'}</button>
</div>
{#if status}<div class="hint">{status}</div>{/if}

<div class="tlist">
  {#each trades as t (t.id)}
    <div class="trow" class:busy={busy === t.id}>
      <div class="ttop">
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
            <span class="done">✓ Abgeschlossen</span>
            {#if rated.has(t.id)}
              <span class="muted">· bewertet ✓</span>
            {:else if ratingFor !== t.id}
              <button class="ok" onclick={() => openRating(t)}>{partnerName(t)} bewerten</button>
            {/if}
          {:else}
            <span class="muted">{LABEL[t.status]}</span>
          {/if}
        </div>
      </div>

      {#if ratingFor === t.id}
        <div class="rating">
          <div class="rrow">
            <span class="rl">Sterne</span>
            <div class="stars">
              {#each [1, 2, 3, 4, 5] as s}
                <button type="button" class="star" class:on={form.stars >= s} onclick={() => (form.stars = s)}>★</button>
              {/each}
            </div>
          </div>
          <label class="chk"><input type="checkbox" bind:checked={form.recommend} /> Würde wieder mit {partnerName(t)} handeln</label>
          <div class="cats">
            {#each CATS as [key, lbl]}
              <label>{lbl}
                <select bind:value={form[key]}>
                  <option value={0}>–</option>{#each [1, 2, 3, 4, 5] as n}<option value={n}>{n}</option>{/each}
                </select>
              </label>
            {/each}
          </div>
          <textarea rows="2" placeholder="Kommentar (optional)" bind:value={form.comment}></textarea>
          <div class="ractions">
            <button class="ok" onclick={() => submitRating(t)} disabled={busy === t.id}>Bewertung senden</button>
            <button class="danger" onclick={() => (ratingFor = null)}>Abbrechen</button>
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .coll-head { display: flex; align-items: center; justify-content: space-between; margin: 8px 0 16px; gap: 12px; flex-wrap: wrap; }
  .coll-head h2 { margin: 0; } .muted { color: var(--muted, #9aa0ad); font-size: 14px; }
  .coll-head button { padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; }
  .tlist { display: flex; flex-direction: column; gap: 10px; }
  .trow { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 14px 16px; }
  .trow.busy { opacity: 0.6; pointer-events: none; }
  .ttop { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
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
  .rating { margin-top: 12px; border-top: 1px solid #2a2f3a; padding-top: 12px; display: flex; flex-direction: column; gap: 10px; }
  .rrow { display: flex; align-items: center; gap: 12px; }
  .rl { color: var(--muted); font-size: 0.85rem; }
  .stars { display: flex; gap: 2px; }
  .star { background: none; border: 0; font-size: 1.5rem; color: #3a3f4b; cursor: pointer; padding: 0 2px; }
  .star.on { color: #f5c451; }
  .chk { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
  .chk input { width: auto; }
  .cats { display: flex; gap: 12px; flex-wrap: wrap; }
  .cats label { display: flex; flex-direction: column; gap: 3px; font-size: 0.78rem; color: var(--muted); }
  .cats select, .rating textarea { padding: 7px 9px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .ractions { display: flex; gap: 10px; }
  .ractions button { padding: 8px 16px; border-radius: 8px; border: 0; cursor: pointer; font-weight: 600; }
  .ractions .ok { background: var(--accent, #6366f1); color: #fff; }
  .ractions .danger { background: transparent; border: 1px solid #2a2f3a; color: #fca5a5; }
</style>
