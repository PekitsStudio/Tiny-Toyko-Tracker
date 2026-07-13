<script lang="ts">
  import { onMount } from 'svelte';
  import { computeStats, type Stats } from '$lib/services/stats.service';
  import { fmt, GAME_LABEL } from '$lib/format';

  let s = $state<Stats | null>(null);
  let status = $state(''); let loading = $state(false);

  async function load() {
    loading = true; status = '';
    try { s = await computeStats(); }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(load);

  const cardsPlusSealed = $derived(s ? s.value + s.sealedValue : 0);
</script>

<h2>Statistik &amp; Auswertung</h2>
{#if status}<div class="hint">{status}</div>{/if}
{#if loading}<div class="hint">Lädt…</div>{/if}

{#if s}
  <div class="cards">
    <div class="stat big"><div class="l">Sammlungswert (Karten)</div><div class="v gold">{fmt(s.value)}</div><div class="sub">{s.cardCount} Karten · {s.uniqueCount} verschiedene</div></div>
    <div class="stat"><div class="l">Investiert</div><div class="v">{fmt(s.invested)}</div></div>
    <div class="stat"><div class="l">Unrealisiert</div><div class="v" class:pos={s.unrealized >= 0} class:neg={s.unrealized < 0}>{s.unrealized >= 0 ? '+' : ''}{fmt(s.unrealized)}</div></div>
    <div class="stat"><div class="l">Realisiert (verkauft)</div><div class="v" class:pos={s.realized >= 0} class:neg={s.realized < 0}>{s.realized >= 0 ? '+' : ''}{fmt(s.realized)}</div></div>
    <div class="stat"><div class="l">Verkaufserlös gesamt</div><div class="v">{fmt(s.soldProceeds)}</div></div>
    <div class="stat"><div class="l">Sealed-Wert</div><div class="v">{fmt(s.sealedValue)}</div></div>
    <div class="stat"><div class="l">Graded-Wert</div><div class="v">{fmt(s.gradedValue, 'USD')}</div></div>
    <div class="stat big"><div class="l">Gesamt (Karten + Sealed)</div><div class="v gold">{fmt(cardsPlusSealed)}</div></div>
  </div>

  {#if s.byGame.length}
    <h3>Nach Spiel</h3>
    <div class="bygame">
      {#each s.byGame as g}
        <div class="grow"><span class="gn">{GAME_LABEL[g.game] ?? g.game}</span><span class="gc">{g.count} Karten</span><span class="gv">{fmt(g.value)}</span></div>
      {/each}
    </div>
  {/if}
{/if}

<style>
  h2 { margin: 8px 0 14px; } h3 { margin: 24px 0 10px; font-size: 1.05rem; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
  .stat { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 14px 16px; }
  .stat.big { grid-column: span 2; }
  .l { color: var(--muted, #9aa0ad); font-size: 0.8rem; }
  .v { font-size: 1.4rem; font-weight: 800; margin-top: 4px; }
  .v.gold { color: var(--gold, #f5c451); }
  .v.pos { color: #86efac; } .v.neg { color: #fca5a5; }
  .sub { color: var(--muted); font-size: 0.78rem; margin-top: 2px; }
  .bygame { display: flex; flex-direction: column; gap: 6px; }
  .grow { display: flex; align-items: center; gap: 12px; background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 10px; padding: 10px 14px; }
  .gn { flex: 1; font-weight: 600; } .gc { color: var(--muted); font-size: 0.85rem; } .gv { color: var(--gold, #f5c451); font-weight: 700; }
  .hint { color: var(--muted, #9aa0ad); margin: 8px 0; }
</style>
