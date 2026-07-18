<script lang="ts">
  import { onMount } from 'svelte';
  import { listCards, listWishlist, type CollectionCard } from '$lib/services/collection.service';
  import { unreadCount } from '$lib/services/social.service';
  import { topMovers, friendsActivity, type Mover, type Activity } from '$lib/services/dashboard.service';
  import { getValueHistory } from '$lib/services/stats.service';
  import { discoverShowcases, type Showcase } from '$lib/services/showcase.service';
  import { listAlerts, type PriceAlert } from '$lib/services/alerts.service';
  import { nav } from '$lib/stores/nav.svelte';
  import { fmt, GAME_LABEL } from '$lib/format';
  import { detail } from '$lib/stores/detail.svelte';

  let value = $state(0); let cardCount = $state(0); let uniqueCount = $state(0);
  let wishCount = $state(0); let offerCount = $state(0); let unread = $state(0);
  let top = $state<CollectionCard[]>([]);
  let gainers = $state<Mover[]>([]); let losers = $state<Mover[]>([]);
  let highlights = $state<Showcase[]>([]);
  let activity = $state<Activity[]>([]);
  let alerts = $state<PriceAlert[]>([]);
  let trend = $state<{ change: number; pct: number; since: string } | null>(null);
  let loading = $state(false); let err = $state('');

  const hitAlerts = $derived(alerts.filter((a) => a.triggered));

  async function load() {
    loading = true; err = '';
    try {
      const cards = await listCards();
      uniqueCount = cards.length;
      cardCount = cards.reduce((s, c) => s + (c.quantity ?? 1), 0);
      value = cards.reduce((s, c) => s + (c.price_current ?? 0) * (c.quantity ?? 1), 0);
      offerCount = cards.filter((c) => c.for_sale).length;
      top = [...cards].filter((c) => (c.price_current ?? 0) > 0).sort((a, b) => (b.price_current ?? 0) * (b.quantity ?? 1) - (a.price_current ?? 0) * (a.quantity ?? 1)).slice(0, 6);
      wishCount = (await listWishlist()).length;
      unread = await unreadCount();
      const mv = await topMovers(); gainers = mv.gainers; losers = mv.losers;
      highlights = (await discoverShowcases()).slice(0, 6);
      try { activity = await friendsActivity(); } catch { activity = []; }
      try { alerts = await listAlerts(); } catch { alerts = []; }
      try {
        const h = await getValueHistory();
        if (h.length >= 2) { const a = h[h.length - 2], b = h[h.length - 1]; const ch = b.total - a.total; trend = { change: ch, pct: a.total ? (ch / a.total) * 100 : 0, since: a.day }; }
      } catch { trend = null; }
    } catch (e) {
      const m = (e as Error).message;
      err = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden, um dein Dashboard zu sehen.' : m;
    } finally { loading = false; }
  }
  onMount(load);

  function sinceLabel(d: string): string { try { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }); } catch { return d; } }
  function openDetail(c: CollectionCard) {
    detail.open({ game: c.game, name: c.name, imageUrl: c.image_url, setName: c.set_name, number: c.number, rarity: c.rarity, lang: c.language, price: c.price_current, currency: c.currency, condition: c.condition, quantity: c.quantity, cardId: c.id, notes: c.notes, forSale: c.for_sale, askingPrice: c.asking_price });
  }
</script>

{#if err}
  <div class="hint">{err}</div>
{:else}
  <!-- Hero -->
  <section class="hero">
    <div class="hmain">
      <div class="eyebrow">Deine Sammlung</div>
      <div class="hval">{fmt(value)}</div>
      <div class="hsub">
        {cardCount} Karten · {uniqueCount} verschiedene
        {#if trend}
          · <span class="delta" class:up={trend.change >= 0} class:down={trend.change < 0}>{trend.change >= 0 ? '▲' : '▼'} {trend.change >= 0 ? '+' : ''}{fmt(trend.change)} ({trend.pct.toFixed(1)}%)</span>
          <span class="muted">seit {sinceLabel(trend.since)}</span>
        {/if}
      </div>
      <div class="hcta">
        <button class="primary" onclick={() => nav.go('sammlung')}>Zur Sammlung</button>
        <button class="ghost" onclick={() => nav.go('suche')}>＋ Karten suchen</button>
      </div>
    </div>
    {#if top[0]?.image_url}
      <button class="heroimg" onclick={() => openDetail(top[0])} title={top[0].name} aria-label={top[0].name}>
        <img src={top[0].image_url} alt="" loading="lazy" />
      </button>
    {/if}
  </section>

  <!-- KPI-Chips -->
  <div class="kpis">
    <button class="kpi" onclick={() => nav.go('sammlung')}><span class="ki">💛</span><span class="kt"><b>{wishCount}</b> Wunschliste</span></button>
    <button class="kpi" onclick={() => nav.go('marktplatz')}><span class="ki">🏷️</span><span class="kt"><b>{offerCount}</b> Angebote</span></button>
    <button class="kpi" onclick={() => nav.go('profil')}><span class="ki">✉️</span><span class="kt"><b class:accent={unread > 0}>{unread}</b> Nachrichten</span></button>
    <button class="kpi" onclick={() => nav.go('sammlung')}><span class="ki">🔔</span><span class="kt"><b class:accent={hitAlerts.length > 0}>{hitAlerts.length}/{alerts.length}</b> Alarme</span></button>
  </div>

  {#if !loading && cardCount === 0}
    <div class="empty">
      <div class="emoji">🃏</div>
      <div><b>Deine Sammlung ist noch leer.</b><div class="muted">Such deine erste Karte und füge sie mit einem Klick hinzu.</div></div>
      <button class="primary" onclick={() => nav.go('suche')}>Karten suchen</button>
    </div>
  {/if}

  <!-- Widget-Raster -->
  <div class="widgets">
    {#if gainers.length || losers.length}
      <section class="w">
        <div class="wh"><h2>Preisbewegungen</h2><span class="muted small">seit Hinzufügen</span></div>
        <div class="mcols">
          <div>
            <div class="ml up">▲ Gewinner</div>
            {#each gainers as m (m.id)}
              <div class="mrow">{#if m.image_url}<img src={m.image_url} alt="" loading="lazy" />{:else}<span class="mph"></span>{/if}<span class="mn">{m.name}</span><span class="mc up">+{fmt(m.change, m.currency ?? 'EUR')}<small>{m.pct.toFixed(0)}%</small></span></div>
            {/each}
            {#if !gainers.length}<div class="muted small">keine</div>{/if}
          </div>
          <div>
            <div class="ml down">▼ Verlierer</div>
            {#each losers as m (m.id)}
              <div class="mrow">{#if m.image_url}<img src={m.image_url} alt="" loading="lazy" />{:else}<span class="mph"></span>{/if}<span class="mn">{m.name}</span><span class="mc down">{fmt(m.change, m.currency ?? 'EUR')}<small>{m.pct.toFixed(0)}%</small></span></div>
            {/each}
            {#if !losers.length}<div class="muted small">keine</div>{/if}
          </div>
        </div>
      </section>
    {/if}

    {#if hitAlerts.length}
      <section class="w">
        <div class="wh"><h2>🔔 Ausgelöste Alarme</h2><button class="link" onclick={() => nav.go('sammlung')}>alle →</button></div>
        {#each hitAlerts.slice(0, 6) as a (a.id)}
          <div class="frow"><span class="fico">🔔</span><span class="ft"><b>{a.name}</b><span class="muted"> · {a.direction === 'below' ? '≤' : '≥'} {fmt(a.target_price, a.currency ?? 'EUR')}{#if a.last_price != null} · jetzt {fmt(a.last_price, a.currency ?? 'EUR')}{/if}</span></span></div>
        {/each}
      </section>
    {/if}

    {#if top.length}
      <section class="w">
        <div class="wh"><h2>🏆 Wertvollste Karten</h2><button class="link" onclick={() => nav.go('sammlung')}>Sammlung →</button></div>
        <div class="tgrid">
          {#each top as c (c.id)}
            <button class="tc" onclick={() => openDetail(c)} title={c.name}>
              {#if c.image_url}<img src={c.image_url} alt="" loading="lazy" />{:else}<div class="tph">?</div>{/if}
              <div class="tv">{c.price_current != null ? fmt(c.price_current, c.currency ?? 'EUR') : '—'}</div>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    {#if activity.length}
      <section class="w">
        <div class="wh"><h2>👥 Freunde</h2><button class="link" onclick={() => nav.go('community')}>Community →</button></div>
        {#each activity.slice(0, 6) as a}
          <div class="frow"><span class="fico">{a.type === 'showcase' ? '⛩' : '📝'}</span><span class="ft"><b>{a.who}</b><span class="muted"> · {a.text}</span></span></div>
        {/each}
      </section>
    {/if}

    {#if highlights.length}
      <section class="w wide">
        <div class="wh"><h2>✨ Community-Highlights</h2><button class="link" onclick={() => nav.go('community')}>alle →</button></div>
        <div class="hgrid">
          {#each highlights as sh (sh.id)}
            <button class="hcard" onclick={() => nav.go('community')}>
              {#if sh.cover}<img src={sh.cover} alt="" loading="lazy" />{:else}<div class="noimg">⛩</div>{/if}
              <div class="hn">{sh.name}</div>
              <div class="hm">von {sh.author_name ?? 'Sammler'} · ♥ {sh.like_count ?? 0}</div>
            </button>
          {/each}
        </div>
      </section>
    {/if}
  </div>
{/if}

<style>
  .hint { color: var(--muted, #9aa0ad); margin: 12px 0; }
  .muted { color: var(--muted, #9aa0ad); } .small { font-size: 0.8rem; }

  /* Hero */
  .hero { position: relative; overflow: hidden; display: flex; gap: 20px; align-items: center; justify-content: space-between;
    border: 1px solid var(--border, #232833); border-radius: 20px; padding: 28px 30px; margin-bottom: 18px;
    background: radial-gradient(130% 150% at 0% 0%, var(--accent-weak, rgba(110,124,255,.15)), transparent 58%), linear-gradient(135deg, var(--surface, #14181f), var(--surface-2, #1b202b)); }
  .eyebrow { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--accent, #6e7cff); font-weight: 700; }
  .hval { font-family: 'Space Grotesk', sans-serif; font-size: 2.8rem; font-weight: 800; color: var(--gold, #f5c451); line-height: 1.05; margin: 6px 0 4px; font-variant-numeric: tabular-nums; }
  .hsub { color: var(--muted, #9aa0ad); font-size: 0.92rem; }
  .delta { font-weight: 700; } .delta.up { color: var(--pos, #37d399); } .delta.down { color: var(--neg, #f2647b); }
  .hcta { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
  .hcta .primary { padding: 10px 18px; border-radius: 10px; border: 0; background: var(--accent, #6e7cff); color: var(--on-accent, #fff); font-weight: 700; cursor: pointer; }
  .hcta .ghost { padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-strong, #38414f); background: transparent; color: inherit; font-weight: 600; cursor: pointer; }
  .heroimg { flex-shrink: 0; border: 0; background: none; padding: 0; cursor: zoom-in; }
  .heroimg img { width: 118px; aspect-ratio: 5/7; object-fit: contain; border-radius: 10px; box-shadow: var(--shadow-lg, 0 24px 60px -18px rgba(0,0,0,.65)); transform: rotate(3deg); transition: transform 0.16s; }
  .heroimg:hover img { transform: rotate(0deg) translateY(-2px); }

  /* KPI-Chips */
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 22px; }
  .kpi { display: flex; align-items: center; gap: 10px; text-align: left; background: var(--surface, #14181f); border: 1px solid var(--border, #232833); border-radius: 12px; padding: 12px 14px; cursor: pointer; color: inherit; transition: border-color 0.15s, transform 0.15s; }
  .kpi:hover { border-color: var(--border-strong, #38414f); transform: translateY(-2px); }
  .ki { font-size: 1.2rem; }
  .kt { font-size: 0.82rem; color: var(--muted, #9aa0ad); } .kt b { display: block; font-size: 1.25rem; color: var(--text, #eaedf3); font-variant-numeric: tabular-nums; }
  .kt b.accent { color: var(--accent, #6e7cff); }

  .empty { display: flex; align-items: center; gap: 16px; background: var(--surface, #14181f); border: 1px dashed var(--border-strong, #38414f); border-radius: 14px; padding: 20px 22px; margin-bottom: 22px; flex-wrap: wrap; }
  .empty .emoji { font-size: 2rem; }
  .empty .primary { margin-left: auto; padding: 10px 18px; border-radius: 10px; border: 0; background: var(--accent, #6e7cff); color: var(--on-accent, #fff); font-weight: 700; cursor: pointer; }

  /* Widget-Raster */
  .widgets { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; align-items: start; }
  .w { background: var(--surface, #14181f); border: 1px solid var(--border, #232833); border-radius: 16px; padding: 16px 18px; }
  .w.wide { grid-column: 1 / -1; }
  .wh { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
  .wh h2 { margin: 0; font-size: 1.02rem; }
  .link { background: none; border: 0; color: var(--accent, #6e7cff); cursor: pointer; font: inherit; font-size: 0.85rem; }

  .mcols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .ml { font-weight: 700; margin-bottom: 6px; font-size: 0.85rem; } .ml.up { color: var(--pos, #37d399); } .ml.down { color: var(--neg, #f2647b); }
  .mrow { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 0.82rem; }
  .mrow img, .mph { width: 22px; height: 30px; object-fit: contain; border-radius: 3px; background: #0a0c10; flex-shrink: 0; }
  .mn { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mc { white-space: nowrap; font-weight: 700; text-align: right; } .mc small { display: block; font-weight: 400; opacity: 0.8; }
  .mc.up { color: var(--pos, #37d399); } .mc.down { color: var(--neg, #f2647b); }

  .frow { display: flex; gap: 10px; align-items: center; padding: 7px 0; font-size: 0.88rem; border-top: 1px solid var(--border, #232833); }
  .frow:first-of-type { border-top: 0; }
  .fico { font-size: 1.05rem; } .ft { min-width: 0; overflow: hidden; }

  .tgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(66px, 1fr)); gap: 8px; }
  .tc { background: none; border: 0; padding: 0; cursor: zoom-in; color: inherit; }
  .tc img, .tph { width: 100%; aspect-ratio: 5/7; object-fit: contain; background: #0a0c10; border-radius: 6px; }
  .tph { display: flex; align-items: center; justify-content: center; color: var(--muted); }
  .tv { font-size: 0.68rem; color: var(--gold, #f5c451); font-weight: 700; text-align: center; margin-top: 3px; font-variant-numeric: tabular-nums; }

  .hgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .hcard { background: var(--surface-2, #1b202b); border: 1px solid var(--border, #232833); border-radius: 12px; overflow: hidden; cursor: pointer; color: inherit; text-align: left; padding: 0; transition: border-color 0.15s, transform 0.15s; }
  .hcard:hover { border-color: var(--border-strong, #38414f); transform: translateY(-2px); }
  .hcard img { width: 100%; height: 92px; object-fit: cover; display: block; }
  .noimg { height: 92px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: #2a2f3a; }
  .hn { font-weight: 600; padding: 8px 10px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hm { color: var(--muted, #9aa0ad); font-size: 0.75rem; padding: 2px 10px 10px; }

  @media (max-width: 640px) {
    .hero { padding: 22px 20px; }
    .hval { font-size: 2.2rem; }
    .heroimg img { width: 92px; }
    .mcols { grid-template-columns: 1fr; gap: 12px; }
  }
</style>
