<script lang="ts">
  import Autocomplete from './Autocomplete.svelte';
  import ResultsGrid from './ResultsGrid.svelte';
  import { AdapterCardsRepo } from '$lib/repositories/cards.repo';
  import { SearchService, type Facets, type PokeHit } from '$lib/services/search.service';
  import { getRecent, recordRecent } from '$lib/recent';
  import { langLabel } from '$lib/format';
  import { addCard, addWishlist } from '$lib/services/collection.service';
  import { detail } from '$lib/stores/detail.svelte';
  import type { Game, SearchCard, SearchFilters, SearchMode } from '$lib/types';

  const service = new SearchService(new AdapterCardsRepo());

  const GAMES: { id: Game; label: string }[] = [
    { id: 'pokemon', label: 'Pokémon' }, { id: 'magic', label: 'Magic' },
    { id: 'yugioh', label: 'Yu-Gi-Oh' }, { id: 'onepiece', label: 'One Piece' },
  ];
  const LANGS = ['', 'de', 'en', 'fr', 'it', 'es', 'ja'];

  let game = $state<Game>('pokemon');
  let query = $state('');
  let lang = $state('');
  let mode = $state<SearchMode>('name');
  let status = $state('');

  let results = $state<SearchCard[]>([]);
  let facets = $state<Facets>({ sets: [], rarities: [], langs: [] });
  let filters = $state<SearchFilters>({ set: '', rarity: '', lang: '', priceOnly: false, sort: 'relevance' });
  let showFilters = $state(false);
  let recent = $state<string[]>(getRecent());

  // Autocomplete-Zustand
  let acOpen = $state(false);
  let acKind = $state<'poke' | 'op'>('poke');
  let pokeHits = $state<PokeHit[]>([]);
  let opHits = $state<string[]>([]);

  let acTimer: ReturnType<typeof setTimeout> | undefined;
  let searchToken = 0;

  const filtered = $derived(service.apply(results, filters));

  function hideAuto() { acOpen = false; }

  function onQueryInput(e?: Event) {
    const q = e ? (e.currentTarget as HTMLInputElement).value.trim() : query.trim();
    clearTimeout(acTimer);
    if (!service.shouldAutocomplete(game, mode, q)) { hideAuto(); return; }
    acTimer = setTimeout(async () => {
      if (query.trim() !== q) return;
      if (game === 'pokemon') {
        const { hits } = await service.pokeAuto(q);
        if (query.trim() !== q) return;
        pokeHits = hits; acKind = 'poke'; acOpen = true;
      } else {
        const hits = await service.opAuto(q);
        if (query.trim() !== q) return;
        opHits = hits; acKind = 'op'; acOpen = true;
      }
    }, 130);
  }

  function pickAuto(name: string, lg: string) {
    query = name;
    if (lg && LANGS.includes(lg)) lang = lg;
    hideAuto();
    doSearch();
  }

  async function doSearch() {
    const q = query.trim();
    if (!q) return;
    recent = recordRecent(q);
    const token = ++searchToken;
    status = 'Suche läuft…';
    results = []; showFilters = false;
    try {
      const res = await service.search({ game, q, lang, mode });
      if (token !== searchToken) return;
      res.forEach((c) => { if (!c.lang) c.lang = lang; });
      results = res;
      status = '';
      if (!res.length) { status = 'Keine Treffer.'; return; }
      facets = service.facets(res);
      showFilters = true;
      enrichPending(token);
    } catch (e) {
      if (token === searchToken) status = 'Fehler bei der Suche: ' + (e as Error).message;
    }
  }

  async function enrichPending(token: number) {
    const pending = results.filter((c) => c.needsDetail && c.externalId);
    if (!pending.length) return;
    const groups = new Map<string, SearchCard[]>();
    for (const c of pending) { const k = c.lang || lang; if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(c); }
    const total = pending.length; const CHUNK = 40; let done = 0;
    for (const [glang, items] of groups) {
      for (let i = 0; i < items.length; i += CHUNK) {
        const slice = items.slice(i, i + CHUNK);
        try {
          const details = await service.enrich(slice.map((c) => c.externalId!), glang);
          if (token !== searchToken) return;
          for (const c of slice) {
            const d = details[c.externalId!]; c.needsDetail = false;
            if (d) Object.assign(c, d);
          }
        } catch { for (const c of slice) c.needsDetail = false; }
        if (token !== searchToken) return;
        done += slice.length;
        results = [...results];
        facets = service.facets(results);
        status = done < total ? `Preise werden geladen… ${done}/${total}` : '';
      }
    }
  }

  function clearQuery() { query = ''; hideAuto(); }
  let flash = $state('');
  let flashErr = $state(false);
  async function act(kind: 'add' | 'quick' | 'wish', c: SearchCard) {
    try {
      if (kind === 'wish') { await addWishlist(c); flash = `„${c.name}" auf die Wunschliste gesetzt.`; }
      else { await addCard(c); flash = `„${c.name}" zur Sammlung hinzugefügt.`; }
      flashErr = false;
    } catch (e) {
      flash = (e as Error).message;
      flashErr = true;
    }
    setTimeout(() => (flash = ''), 3500);
  }

  function openDetail(c: SearchCard) {
    detail.open({
      game: c.game, name: c.name, imageUrl: c.imageUrl, setName: c.setName, number: c.number,
      rarity: c.rarity, lang: c.lang, price: c.cardmarketPrice, priceLow: c.priceLow,
      priceTrend: c.priceTrend, currency: c.currency, cardmarketUrl: c.cardmarketUrl, externalId: c.externalId
    });
  }
</script>

<div class="search-hero">
  <h1 class="sh-title">Welche Karte suchst du heute?</h1>
  <p class="sh-sub">Durchsuche Pokémon, Magic, Yu-Gi-Oh und One Piece – nach Name oder Nummer.</p>

  <div class="sh-games">
    {#each GAMES as g}
      <button type="button" class="sh-game" class:active={game === g.id}
        onclick={() => { game = g.id; onQueryInput(); }}>{g.label}</button>
    {/each}
  </div>

  <div class="sh-bar">
    <span class="sh-ico" aria-hidden="true">🔍</span>
    <div class="ac-wrap sh-acwrap">
      <input type="text" id="query" placeholder="Suche nach Karten, Sets oder Nummern…"
        autocomplete="off" aria-label="Kartensuche"
        bind:value={query} oninput={onQueryInput}
        onkeydown={(e) => { if (e.key === 'Enter') { hideAuto(); doSearch(); } }} />
      <Autocomplete open={acOpen} kind={acKind} {pokeHits} {opHits} onpick={pickAuto} />
    </div>
    {#if query}<button type="button" class="sh-clear" title="Leeren" onclick={clearQuery}>✕</button>{/if}
    <button class="sh-go" onclick={() => { hideAuto(); doSearch(); }}>Suchen</button>
  </div>

  <div class="sh-secondary">
    <select bind:value={lang} title="Sprache">
      {#each LANGS as l}<option value={l}>{l ? langLabel(l) : 'Sprache (auto)'}</option>{/each}
    </select>
    <select bind:value={mode} title="Suche nach Name oder Kartennummer">
      <option value="name">nach Name</option>
      <option value="number">nach Nummer</option>
    </select>
  </div>

  {#if recent.length}
    <div class="sh-suggest">
      <span class="muted">Zuletzt:</span>
      {#each recent as r}
        <button type="button" class="chip" onclick={() => { query = r; doSearch(); }}>{r}</button>
      {/each}
    </div>
  {/if}
</div>

<div class="hint">{status}</div>
{#if flash}<div class="flash" class:err={flashErr}>{flash}</div>{/if}

{#if showFilters}
  <div class="filterbar row">
    <span><span class="flabel">Set</span>
      <select bind:value={filters.set}><option value="">alle</option>
        {#each facets.sets as s}<option>{s}</option>{/each}</select></span>
    <span><span class="flabel">Seltenheit</span>
      <select bind:value={filters.rarity}><option value="">alle</option>
        {#each facets.rarities as r}<option>{r}</option>{/each}</select></span>
    {#if facets.langs.length > 1}
      <span><span class="flabel">Sprache</span>
        <select bind:value={filters.lang}><option value="">alle</option>
          {#each facets.langs as l}<option value={l}>{langLabel(l)}</option>{/each}</select></span>
    {/if}
    <span><label style="cursor:pointer"><input type="checkbox" bind:checked={filters.priceOnly} style="width:auto" /><span> nur mit Preis</span></label></span>
    <span><span class="flabel">Sortieren</span>
      <select bind:value={filters.sort}>
        <option value="relevance">Relevanz</option>
        <option value="price-desc">Preis ↓</option>
        <option value="price-asc">Preis ↑</option>
        <option value="name">Name A–Z</option>
        <option value="number">Nummer</option>
      </select></span>
    <span class="hint">{filtered.length} von {results.length}</span>
  </div>
{/if}

<ResultsGrid
  cards={filtered}
  onadd={(c) => act('add', c)}
  onquick={(c) => act('quick', c)}
  onwish={(c) => act('wish', c)}
  ondetail={openDetail}
/>

<style>
  .flash { margin: 8px 0; padding: 8px 12px; border-radius: 8px; background: #16351f; color: #86efac; }
  .flash.err { background: #3a1620; color: #fca5a5; }
</style>
