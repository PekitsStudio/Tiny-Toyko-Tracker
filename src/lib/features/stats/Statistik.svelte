<script lang="ts">
  import { onMount } from 'svelte';
  import { computeStats, recordSnapshot, getValueHistory, type Stats, type Bucket, type HistPoint } from '$lib/services/stats.service';
  import { fmt, GAME_LABEL } from '$lib/format';
  import { detail } from '$lib/stores/detail.svelte';

  let s = $state<Stats | null>(null);
  let history = $state<HistPoint[]>([]);
  let status = $state(''); let loading = $state(false);

  async function load() {
    loading = true; status = '';
    try {
      s = await computeStats();
      try { await recordSnapshot(s.value); } catch { /* Snapshot optional */ }
      try { history = await getValueHistory(); } catch { history = []; }
    } catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(load);

  const cardsPlusSealed = $derived(s ? s.value + s.sealedValue : 0);
  function maxVal(items: Bucket[]): number { return items.reduce((m, b) => Math.max(m, b.value), 0) || 1; }
  function shortDay(d: string): string { try { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }); } catch { return d; } }

  // SVG-Wertverlauf
  const CW = 600, CH = 180, PAD = 10;
  const chart = $derived.by(() => {
    if (!history.length) return null;
    const totals = history.map((h) => h.total);
    const min = Math.min(...totals), max = Math.max(...totals);
    const span = max - min || Math.max(max, 1);
    const n = history.length;
    const px = (i: number) => (n <= 1 ? CW / 2 : PAD + (i / (n - 1)) * (CW - 2 * PAD));
    const py = (v: number) => CH - PAD - ((v - min) / span) * (CH - 2 * PAD);
    const pts = history.map((h, i) => [px(i), py(h.total)] as [number, number]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = `M ${pts[0][0].toFixed(1)} ${(CH - PAD).toFixed(1)} ` + pts.map((p) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ` L ${pts[n - 1][0].toFixed(1)} ${(CH - PAD).toFixed(1)} Z`;
    return { line, area, min, max, pts, first: history[0], last: history[n - 1] };
  });
</script>

<h2>Statistik &amp; Auswertung</h2>
{#if status}<div class="hint">{status}</div>{/if}
{#if loading && !s}<div class="hint">Lädt…</div>{/if}

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

  {#if chart}
    <div class="chartbox">
      <div class="charthead">
        <h3>📈 Wertverlauf (Karten)</h3>
        <span class="muted">{shortDay(chart.last.day)} · {fmt(chart.last.total)}</span>
      </div>
      <svg viewBox="0 0 {CW} {CH}" class="chart" preserveAspectRatio="none" role="img" aria-label="Wertverlauf">
        {#if chart.pts.length > 1}
          <path d={chart.area} class="area" />
          <path d={chart.line} class="cline" />
        {/if}
        <circle cx={chart.pts[chart.pts.length - 1][0]} cy={chart.pts[chart.pts.length - 1][1]} r="3.5" class="dot" />
      </svg>
      <div class="chartfoot">
        <span class="muted">{shortDay(chart.first.day)}</span>
        <span class="muted">Min {fmt(chart.min)} · Max {fmt(chart.max)}</span>
        <span class="muted">{shortDay(chart.last.day)}</span>
      </div>
      {#if history.length < 2}<div class="chartnote">Der Verlauf füllt sich mit der Zeit – bei jedem Öffnen wird der heutige Wert gespeichert.</div>{/if}
    </div>
  {/if}

  {#if s.topCards.length}
    <h3 class="sech">🏆 Wertvollste Karten</h3>
    <div class="topgrid">
      {#each s.topCards as t, i (t.id)}
        <button class="tcard" onclick={() => detail.open({ game: t.game, name: t.name, imageUrl: t.image_url, price: t.value / (t.quantity || 1), currency: t.currency })}>
          <span class="rank">{i + 1}</span>
          {#if t.image_url}<img src={t.image_url} alt="" loading="lazy" />{:else}<div class="tph">?</div>{/if}
          <div class="tn">{t.name}</div>
          <div class="tv">{fmt(t.value, t.currency ?? 'EUR')}</div>
        </button>
      {/each}
    </div>
  {/if}

  {#snippet bars(items: Bucket[])}
    {#each items as b (b.key)}
      <div class="bar-row">
        <span class="bl">{b.key}</span>
        <span class="bt"><span class="bf" style="width:{Math.max(3, (b.value / maxVal(items)) * 100).toFixed(0)}%"></span></span>
        <span class="bv">{fmt(b.value)}</span>
      </div>
    {/each}
  {/snippet}

  <div class="anrows">
    <div class="ancard"><h3>🎮 Nach Spiel</h3>
      {#each s.byGame as g (g.key)}
        <div class="bar-row"><span class="bl">{GAME_LABEL[g.key] ?? g.key}</span><span class="bt"><span class="bf" style="width:{Math.max(3, (g.value / maxVal(s.byGame)) * 100).toFixed(0)}%"></span></span><span class="bv">{fmt(g.value)}</span></div>
      {/each}
    </div>
    {#if s.byRarity.length}<div class="ancard"><h3>✨ Nach Seltenheit</h3>{@render bars(s.byRarity)}</div>{/if}
    {#if s.bySet.length}<div class="ancard"><h3>📚 Nach Set</h3>{@render bars(s.bySet)}</div>{/if}
    {#if s.byCondition.length}<div class="ancard"><h3>🛡️ Nach Zustand</h3>{@render bars(s.byCondition)}</div>{/if}
    {#if s.byLanguage.length}<div class="ancard"><h3>🌐 Nach Sprache</h3>{@render bars(s.byLanguage)}</div>{/if}
  </div>
{/if}

<style>
  h2 { margin: 8px 0 14px; }
  h3 { margin: 0 0 10px; font-size: 1.02rem; }
  .sech { margin: 24px 0 12px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
  .stat { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 14px 16px; }
  .stat.big { grid-column: span 2; }
  .l { color: var(--muted, #9aa0ad); font-size: 0.8rem; }
  .v { font-size: 1.4rem; font-weight: 800; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .v.gold { color: var(--gold, #f5c451); }
  .v.pos { color: #86efac; } .v.neg { color: #fca5a5; }
  .sub { color: var(--muted); font-size: 0.78rem; margin-top: 2px; }
  .muted { color: var(--muted, #9aa0ad); }

  .chartbox { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 14px; padding: 16px 18px; margin: 20px 0; }
  .charthead { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
  .charthead h3 { margin: 0; }
  .chart { width: 100%; height: 180px; display: block; }
  .area { fill: rgba(110,124,255,0.16); stroke: none; }
  .cline { fill: none; stroke: var(--accent, #6e7cff); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .dot { fill: var(--gold, #f5c451); }
  .chartfoot { display: flex; justify-content: space-between; gap: 8px; font-size: 0.76rem; margin-top: 8px; flex-wrap: wrap; }
  .chartnote { color: var(--muted); font-size: 0.78rem; margin-top: 6px; }

  .topgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; margin-bottom: 6px; }
  .tcard { position: relative; background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 8px; cursor: pointer; color: inherit; text-align: left; }
  .tcard:hover { border-color: var(--border-strong, #38414f); transform: translateY(-2px); }
  .rank { position: absolute; top: 8px; left: 8px; z-index: 1; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--gold-weak, rgba(242,184,90,.14)); color: var(--gold, #f5c451); font-weight: 800; font-size: 0.72rem; }
  .tcard img, .tph { width: 100%; aspect-ratio: 5/7; object-fit: contain; background: #0a0c10; border-radius: 8px; }
  .tph { display: flex; align-items: center; justify-content: center; color: var(--muted); }
  .tn { font-size: 0.78rem; font-weight: 600; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tv { color: var(--gold, #f5c451); font-weight: 700; font-size: 0.85rem; font-variant-numeric: tabular-nums; }

  .anrows { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-top: 22px; }
  .ancard { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 14px; padding: 16px 18px; }
  .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 0.84rem; }
  .bl { width: 120px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bt { flex: 1; height: 12px; background: #12151d; border-radius: 999px; overflow: hidden; }
  .bf { display: block; height: 100%; background: linear-gradient(90deg, var(--accent, #6e7cff), var(--accent-2, #8a7bff)); border-radius: 999px; }
  .bv { width: 80px; text-align: right; flex-shrink: 0; color: var(--gold, #f5c451); font-weight: 600; font-variant-numeric: tabular-nums; }
  .hint { color: var(--muted, #9aa0ad); margin: 8px 0; }

  @media (max-width: 560px) {
    .stat.big { grid-column: span 1; }
    .bl { width: 88px; }
    .bv { width: 64px; }
  }
</style>
