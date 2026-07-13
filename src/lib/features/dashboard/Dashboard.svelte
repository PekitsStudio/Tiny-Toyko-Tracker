<script lang="ts">
  import { onMount } from 'svelte';
  import { listCards, listWishlist, type CollectionCard } from '$lib/services/collection.service';
  import { unreadCount } from '$lib/services/social.service';
  import { topMovers, friendsActivity, type Mover, type Activity } from '$lib/services/dashboard.service';
  import { discoverShowcases, type Showcase } from '$lib/services/showcase.service';
  import { listAlerts, type PriceAlert } from '$lib/services/alerts.service';
  import { nav } from '$lib/stores/nav.svelte';
  import { fmt, GAME_LABEL } from '$lib/format';
  import { detail } from '$lib/stores/detail.svelte';

  let value = $state(0); let cardCount = $state(0); let wishCount = $state(0); let offerCount = $state(0);
  let unread = $state(0);
  let top = $state<CollectionCard[]>([]);
  let gainers = $state<Mover[]>([]); let losers = $state<Mover[]>([]);
  let highlights = $state<Showcase[]>([]);
  let activity = $state<Activity[]>([]);
  let hitAlerts = $state<PriceAlert[]>([]);
  let loading = $state(false); let err = $state('');

  async function load() {
    loading = true; err = '';
    try {
      const cards = await listCards();
      cardCount = cards.reduce((s, c) => s + (c.quantity ?? 1), 0);
      value = cards.reduce((s, c) => s + (c.price_current ?? 0) * (c.quantity ?? 1), 0);
      offerCount = cards.filter((c) => c.for_sale).length;
      top = [...cards].sort((a, b) => (b.price_current ?? 0) - (a.price_current ?? 0)).slice(0, 6);
      wishCount = (await listWishlist()).length;
      unread = await unreadCount();
      const mv = await topMovers(); gainers = mv.gainers; losers = mv.losers;
      highlights = (await discoverShowcases()).slice(0, 6);
      try { activity = await friendsActivity(); } catch { activity = []; }
      try { hitAlerts = (await listAlerts()).filter((a) => a.triggered); } catch { hitAlerts = []; }
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

{#if !err}
  <div class="stats">
    <button class="stat big" onclick={() => nav.go('sammlung')}>
      <div class="label">Sammlungswert</div><div class="num gold">{fmt(value)}</div><div class="sub">{cardCount} Karten</div>
    </button>
    <button class="stat" onclick={() => nav.go('sammlung')}><div class="label">Wunschliste</div><div class="num">{wishCount}</div></button>
    <button class="stat" onclick={() => nav.go('marktplatz')}><div class="label">Deine Angebote</div><div class="num">{offerCount}</div></button>
    <button class="stat" onclick={() => nav.go('profil')}><div class="label">Neue Nachrichten</div><div class="num" class:accent={unread > 0}>{unread}</div></button>
    <button class="stat" onclick={() => nav.go('suche')}><div class="label">Karten finden</div><div class="num">＋</div><div class="sub">Zur Suche</div></button>
  </div>

  {#if hitAlerts.length}
    <h2 class="th">Ausgelöste Preisalarme 🔔</h2>
    <div class="feed">
      {#each hitAlerts as a}
        <div class="fitem"><span class="fico">🔔</span><span><b>{a.name}</b> · {a.direction === 'below' ? '≤' : '≥'} {fmt(a.target_price, a.currency ?? 'EUR')}{#if a.last_price != null} · aktuell {fmt(a.last_price, a.currency ?? 'EUR')}{/if}</span></div>
      {/each}
    </div>
  {/if}

  {#if gainers.length || losers.length}
    <h2 class="th">Preisbewegungen (seit Hinzufügen)</h2>
    <div class="movers">
      <div class="mcol">
        <div class="mh up">▲ Gewinner</div>
        {#each gainers as m (m.id)}
          <div class="mrow"><span class="mn">{m.name}</span><span class="mc up">+{fmt(m.change, m.currency ?? 'EUR')} ({m.pct.toFixed(0)}%)</span></div>
        {/each}
        {#if !gainers.length}<div class="muted small">keine</div>{/if}
      </div>
      <div class="mcol">
        <div class="mh down">▼ Verlierer</div>
        {#each losers as m (m.id)}
          <div class="mrow"><span class="mn">{m.name}</span><span class="mc down">{fmt(m.change, m.currency ?? 'EUR')} ({m.pct.toFixed(0)}%)</span></div>
        {/each}
        {#if !losers.length}<div class="muted small">keine</div>{/if}
      </div>
    </div>
  {/if}

  {#if highlights.length}
    <div class="hh"><h2 class="th">Community-Highlights</h2><button class="link" onclick={() => nav.go('community')}>alle ansehen →</button></div>
    <div class="hgrid">
      {#each highlights as s (s.id)}
        <button class="hcard" onclick={() => nav.go('community')}>
          {#if s.cover}<img src={s.cover} alt="" loading="lazy" />{:else}<div class="noimg">⛩</div>{/if}
          <div class="hn">{s.name}</div>
          <div class="hm">von {s.author_name ?? 'Sammler'} · ♥ {s.like_count ?? 0}</div>
        </button>
      {/each}
    </div>
  {/if}

  {#if activity.length}
    <h2 class="th">Aktivitäten von Freunden</h2>
    <div class="feed">
      {#each activity as a}
        <div class="fitem"><span class="fico">{a.type === 'showcase' ? '⛩' : '📝'}</span><span><b>{a.who}</b> · {a.text}</span></div>
      {/each}
    </div>
  {/if}

  {#if top.length}
    <h2 class="th">Wertvollste Karten</h2>
    <div class="grid">
      {#each top as c (c.id)}
        <div class="card">
          <span class="tag {c.game}">{GAME_LABEL[c.game] ?? c.game}</span>
          {#if c.image_url}<img src={c.image_url} alt="" loading="lazy" style="cursor:zoom-in" onclick={() => openDetail(c)} />{:else}<div class="ph">kein Bild</div>{/if}
          <div class="meta"><div class="name">{c.name}</div><div class="price">{c.price_current != null ? fmt(c.price_current, c.currency ?? 'EUR') : 'kein Preis'}</div></div>
        </div>
      {/each}
    </div>
  {/if}
{/if}

<style>
  .greet { margin: 8px 0 18px; font-size: 1.6rem; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 26px; }
  .stat { text-align: left; background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 14px; padding: 16px; cursor: pointer; color: inherit; transition: border-color 0.15s, transform 0.15s; }
  .stat:hover { border-color: var(--accent, #6366f1); transform: translateY(-2px); }
  .stat.big { grid-column: span 2; }
  .label { color: var(--muted, #9aa0ad); font-size: 0.82rem; }
  .num { font-size: 1.9rem; font-weight: 800; margin-top: 4px; }
  .num.gold { color: var(--gold, #f5c451); } .num.accent { color: var(--accent, #6366f1); }
  .sub { color: var(--muted); font-size: 0.8rem; margin-top: 2px; }
  .th { margin: 8px 0 12px; font-size: 1.15rem; }
  .hh { display: flex; align-items: baseline; justify-content: space-between; }
  .link { background: none; border: 0; color: var(--accent, #6366f1); cursor: pointer; font: inherit; }
  .movers { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 26px; }
  .mcol { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 12px 14px; }
  .mh { font-weight: 700; margin-bottom: 8px; } .mh.up { color: #86efac; } .mh.down { color: #fca5a5; }
  .mrow { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; font-size: 0.88rem; }
  .mn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mc.up { color: #86efac; } .mc.down { color: #fca5a5; } .mc { white-space: nowrap; font-weight: 600; }
  .hgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-bottom: 26px; }
  .hcard { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; overflow: hidden; cursor: pointer; color: inherit; text-align: left; padding: 0; }
  .hcard img { width: 100%; height: 90px; object-fit: cover; display: block; }
  .noimg { height: 90px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: #2a2f3a; }
  .hn { font-weight: 600; padding: 8px 10px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hm { color: var(--muted); font-size: 0.75rem; padding: 2px 10px 10px; }
  .muted { color: var(--muted, #9aa0ad); } .small { font-size: 0.8rem; }
  .feed { display: flex; flex-direction: column; gap: 6px; margin-bottom: 26px; }
  .fitem { display: flex; gap: 10px; align-items: center; background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; }
  .fico { font-size: 1.1rem; }
  @media (max-width: 640px) { .movers { grid-template-columns: 1fr; } .stat.big { grid-column: span 1; } }
</style>
