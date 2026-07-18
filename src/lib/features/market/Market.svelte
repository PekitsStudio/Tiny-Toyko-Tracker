<script lang="ts">
  import { onMount } from 'svelte';
  import { listMarket, listSeeking, type MarketCard, type SeekingCard } from '$lib/services/market.service';
  import { createTrade } from '$lib/services/trade.service';
  import { fmt, GAME_LABEL } from '$lib/format';
  import Flag from '$lib/components/Flag.svelte';
  import { detail } from '$lib/stores/detail.svelte';
  import { marketView } from '$lib/stores/marketview.svelte';
  import { profileView } from '$lib/stores/profileview.svelte';
  import { nav } from '$lib/stores/nav.svelte';

  let { only }: { only?: 'angebote' | 'suche' } = $props();

  const GAMES = [
    { id: '', label: 'Alle' }, { id: 'pokemon', label: 'Pokémon' }, { id: 'magic', label: 'Magic' },
    { id: 'yugioh', label: 'Yu-Gi-Oh' }, { id: 'onepiece', label: 'One Piece' }
  ];
  let mode = $state<'angebote' | 'suche'>(only ?? 'angebote');
  let game = $state(''); let q = $state('');
  let offers = $state<MarketCard[]>([]); let seeks = $state<SeekingCard[]>([]);
  let status = $state(''); let loading = $state(false);
  let buyMsg = $state(''); let buying = $state<number | null>(null);

  async function load() {
    loading = true; status = '';
    try {
      if (mode === 'angebote') { offers = await listMarket({ game, q }); if (!offers.length) status = 'Keine Angebote gefunden.'; }
      else { seeks = await listSeeking({ game, q }); if (!seeks.length) status = 'Keine Gesuche gefunden.'; }
    } catch (e) { status = (e as Error).message; }
    finally { loading = false; }
  }
  onMount(load);

  function openProfile(id?: string | null) { if (id) profileView.open(id); }
  function openOffer(m: MarketCard) { marketView.open(m); }
  function openSeek(s: SeekingCard) { detail.open({ game: s.game, name: s.name, imageUrl: s.image_url, setName: s.set_name, number: s.number, rarity: s.rarity, lang: s.language, price: s.seek_max_price, currency: s.seek_currency, cardmarketUrl: s.cardmarket_url, condition: s.seek_condition }); }

  async function buy(m: MarketCard) {
    if (!confirm(`Kaufanfrage für „${m.name}" an ${m.seller_name ?? 'Verkäufer'} senden${m.asking_price != null ? ' (' + fmt(m.asking_price, m.currency ?? 'EUR') + ')' : ''}?`)) return;
    buying = m.id; buyMsg = '';
    try {
      await createTrade({ responder: m.seller_id, cardId: m.id, cardName: m.name, cardGame: m.game, price: m.asking_price, currency: m.currency });
      buyMsg = `Kaufanfrage gesendet — unter Marktplatz → Handel verfolgen.`;
    } catch (e) { buyMsg = (e as Error).message; }
    finally { buying = null; }
  }
</script>

<div class="coll-head">
  {#if !only}
    <div class="modes">
      <button class:active={mode === 'angebote'} onclick={() => { mode = 'angebote'; load(); }}>Angebote</button>
      <button class:active={mode === 'suche'} onclick={() => { mode = 'suche'; load(); }}>Suche</button>
    </div>
  {:else}<div></div>{/if}
  <div class="muted">{mode === 'angebote' ? offers.length + ' Angebote' : seeks.length + ' Gesuche'}</div>
</div>

<div class="mkt-filter">
  {#each GAMES as g}<button class="chip" class:active={game === g.id} onclick={() => { game = g.id; load(); }}>{g.label}</button>{/each}
  <input placeholder="Name suchen…" bind:value={q} onkeydown={(e) => { if (e.key === 'Enter') load(); }} />
  <button class="ghost" onclick={load} disabled={loading}>{loading ? '…' : 'Suchen'}</button>
</div>

{#if buyMsg}<div class="buymsg">{buyMsg} <button class="link" onclick={() => nav.go('marktplatz')}>Zum Marktplatz →</button></div>{/if}
{#if status}<div class="hint">{status}</div>{/if}

<div class="grid">
  {#if mode === 'angebote'}
    {#each offers as m (m.id)}
      <div class="card">
        <span class="tag {m.game}">{GAME_LABEL[m.game] ?? m.game}</span>
        {#if m.image_url}<img src={m.image_url} alt="" loading="lazy" style="cursor:zoom-in" onclick={() => openOffer(m)} />{:else}<div class="ph">kein Bild</div>{/if}
        <div class="meta">
          <div class="name">{m.name}</div>
          <div class="set"><Flag lang={m.language} />{m.set_name ?? ''}{#if m.condition} · {m.condition}{/if}</div>
          <div class="price">{m.asking_price != null ? fmt(m.asking_price, m.currency ?? 'EUR') : 'VB'}</div>
          <div class="who">von <button class="link" onclick={() => openProfile(m.seller_id)}>{m.seller_name ?? 'Sammler'}</button>{m.is_mine ? ' (du)' : ''}</div>
          {#if m.seller_contact}<div class="contact">Kontakt: {m.seller_contact}</div>{/if}
        </div>
        {#if !m.is_mine}
          <div class="card-actions"><button class="buy" onclick={() => buy(m)} disabled={buying === m.id}>{buying === m.id ? '…' : 'Kaufen'}</button></div>
        {/if}
      </div>
    {/each}
  {:else}
    {#each seeks as s (s.id)}
      <div class="card">
        <span class="tag {s.game}">{GAME_LABEL[s.game] ?? s.game}</span>
        {#if s.image_url}<img src={s.image_url} alt="" loading="lazy" style="cursor:zoom-in" onclick={() => openSeek(s)} />{:else}<div class="ph">kein Bild</div>{/if}
        <div class="meta">
          <div class="name">{s.name}</div>
          <div class="set"><Flag lang={s.language} />{s.set_name ?? ''}{#if s.seek_condition} · ab {s.seek_condition}{/if}</div>
          <div class="price">{s.seek_max_price != null ? 'bis ' + fmt(s.seek_max_price, s.seek_currency ?? 'EUR') : 'Preis egal'}</div>
          <div class="who">sucht <button class="link" onclick={() => openProfile(s.seeker_id)}>{s.seeker_name ?? 'Sammler'}</button>{s.is_mine ? ' (du)' : ''}{#if s.seeker_country} · {s.seeker_country}{/if}</div>
          {#if s.seeker_contact}<div class="contact">Kontakt: {s.seeker_contact}</div>{/if}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .coll-head { display: flex; align-items: center; justify-content: space-between; margin: 8px 0 12px; gap: 12px; flex-wrap: wrap; }
  .muted { color: var(--muted, #9aa0ad); font-size: 14px; }
  .modes { display: flex; gap: 6px; }
  .modes button { padding: 8px 18px; border-radius: 999px; border: 1px solid #2a2f3a; background: transparent; color: inherit; font-weight: 600; cursor: pointer; }
  .modes button.active { background: var(--accent, #6366f1); border-color: transparent; color: #fff; }
  .mkt-filter { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
  .mkt-filter .chip { padding: 7px 14px; border-radius: 999px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; font-size: 0.85rem; }
  .mkt-filter .chip.active { background: var(--accent, #6366f1); border-color: transparent; color: #fff; }
  .mkt-filter input { padding: 8px 11px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: inherit; }
  .mkt-filter .ghost { padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; }
  .buymsg { background: #16351f; color: #86efac; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; }
  .buymsg .link { background: none; border: 0; color: #86efac; text-decoration: underline; cursor: pointer; font: inherit; }
  .who { font-size: 0.72rem; color: var(--muted); margin-top: 2px; }
  .who .link { background: none; border: 0; padding: 0; color: var(--accent, #6366f1); cursor: pointer; font: inherit; text-decoration: underline; }
  .contact { font-size: 0.72rem; color: var(--accent, #6366f1); }
  .card-actions .buy { flex: 1; padding: 9px; border: 0; border-top: 1px solid var(--border, #2a2f3a); background: var(--accent, #6366f1); color: #fff; font-weight: 700; cursor: pointer; }
</style>
