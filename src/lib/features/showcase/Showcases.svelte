<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listMyShowcases, discoverShowcases, getShowcaseCards, createShowcase, deleteShowcase,
    updateShowcase, addCardsToShowcase, removeShowcaseCard, toggleLike,
    type Showcase, type ShowcaseCard, type Visibility
  } from '$lib/services/showcase.service';
  import { listCards, type CollectionCard } from '$lib/services/collection.service';
  import { GAME_LABEL } from '$lib/format';
  import Flag from '$lib/components/Flag.svelte';

  let { only }: { only?: 'meine' | 'entdecken' } = $props();

  const VIS: Record<Visibility, string> = { private: 'Privat', unlisted: 'Per Link', public: 'Öffentlich' };
  let mode = $state<'meine' | 'entdecken'>(only ?? 'meine');
  let list = $state<Showcase[]>([]);
  let status = $state(''); let loading = $state(false); let busy = $state(false);

  let sc = $state<Showcase | null>(null);
  let cards = $state<ShowcaseCard[]>([]);

  let showCreate = $state(false);
  let cf = $state({ name: '', description: '', visibility: 'public' as Visibility, game: '' });

  let showPicker = $state(false);
  let myColl = $state<CollectionCard[]>([]);

  async function loadList() {
    loading = true; status = ''; sc = null;
    try { list = mode === 'meine' ? await listMyShowcases() : await discoverShowcases(); if (!list.length) status = mode === 'meine' ? 'Du hast noch keine Sammlung erstellt.' : 'Noch keine öffentlichen Sammlungen.'; }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(loadList);
  function switchMode(m: 'meine' | 'entdecken') { mode = m; showCreate = false; loadList(); }

  async function open(s: Showcase) {
    sc = s; showPicker = false;
    try { cards = await getShowcaseCards(s.id); } catch (e) { status = (e as Error).message; }
  }
  function back() { sc = null; loadList(); }

  async function doCreate() {
    if (!cf.name.trim()) return; busy = true;
    try { const s = await createShowcase({ name: cf.name.trim(), description: cf.description || null, visibility: cf.visibility, game: cf.game || null }); showCreate = false; cf = { name: '', description: '', visibility: 'public', game: '' }; await loadList(); await open({ ...s, card_count: 0 } as Showcase); }
    catch (e) { status = (e as Error).message; } finally { busy = false; }
  }
  async function del(s: Showcase) {
    if (!confirm(`Sammlung „${s.name}" löschen?`)) return; busy = true;
    try { await deleteShowcase(s.id); list = list.filter((x) => x.id !== s.id); if (sc?.id === s.id) sc = null; }
    catch (e) { status = (e as Error).message; } finally { busy = false; }
  }
  async function setVis(v: Visibility) {
    if (!sc) return; busy = true;
    try { await updateShowcase(sc.id, { visibility: v }); sc.visibility = v; }
    catch (e) { status = (e as Error).message; } finally { busy = false; }
  }
  async function openPicker() { showPicker = true; if (!myColl.length) { try { myColl = await listCards(); } catch (e) { status = (e as Error).message; } } }
  async function addCard(c: CollectionCard) {
    if (!sc) return;
    try { await addCardsToShowcase(sc.id, [c]); cards = await getShowcaseCards(sc.id); }
    catch (e) { status = (e as Error).message; }
  }
  async function removeCard(rowId: number) {
    try { await removeShowcaseCard(rowId); cards = cards.filter((x) => x.id !== rowId); }
    catch (e) { status = (e as Error).message; }
  }
  async function like(s: Showcase) {
    const liked = (s.my_reactions ?? []).includes('like');
    try {
      await toggleLike(s.id, liked);
      s.like_count = (s.like_count ?? 0) + (liked ? -1 : 1);
      s.my_reactions = liked ? (s.my_reactions ?? []).filter((k) => k !== 'like') : [ ...(s.my_reactions ?? []), 'like'];
      list = [...list]; if (sc?.id === s.id) sc = { ...s };
    } catch (e) { status = (e as Error).message; }
  }
</script>

{#if !sc}
  <div class="coll-head">
    {#if !only}
      <div class="modes">
        <button class:active={mode === 'meine'} onclick={() => switchMode('meine')}>Meine</button>
        <button class:active={mode === 'entdecken'} onclick={() => switchMode('entdecken')}>Entdecken</button>
      </div>
    {:else}<div></div>{/if}
    {#if mode === 'meine'}<button class="primary" onclick={() => (showCreate = !showCreate)}>{showCreate ? 'Abbrechen' : '+ Neue Sammlung'}</button>{/if}
  </div>

  {#if showCreate}
    <div class="addform">
      <label>Name<input bind:value={cf.name} placeholder="z. B. Meine Charizards" /></label>
      <label>Beschreibung<textarea rows="2" bind:value={cf.description}></textarea></label>
      <div class="grid2">
        <label>Sichtbarkeit<select bind:value={cf.visibility}><option value="private">Privat</option><option value="unlisted">Per Link</option><option value="public">Öffentlich</option></select></label>
      </div>
      <button class="primary" onclick={doCreate} disabled={busy || !cf.name.trim()}>Erstellen</button>
    </div>
  {/if}

  {#if status}<div class="hint">{status}</div>{/if}

  <div class="sgrid">
    {#each list as s (s.id)}
      <div class="scard">
        <button class="cover" onclick={() => open(s)}>
          {#if s.cover}<img src={s.cover} alt="" loading="lazy" />{:else}<div class="noimg">⛩</div>{/if}
        </button>
        <div class="sbody">
          <button class="sname" onclick={() => open(s)}>{s.name}</button>
          <div class="smeta">{s.card_count} Karten · <span class="vis">{VIS[s.visibility]}</span></div>
          {#if mode !== 'meine'}<div class="sauthor">von {s.author_name ?? 'Sammler'}</div>{/if}
          <div class="sactions">
            <button class="likebtn" class:on={(s.my_reactions ?? []).includes('like')} onclick={() => like(s)}>♥ {s.like_count ?? 0}</button>
            {#if s.is_mine}<button class="del" onclick={() => del(s)}>Löschen</button>{/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
{:else}
  <!-- Detailansicht -->
  <div class="coll-head">
    <button class="ghost" onclick={back}>← zurück</button>
    <div class="right">
      {#if sc.is_mine}
        <select value={sc.visibility} onchange={(e) => setVis((e.currentTarget as HTMLSelectElement).value as Visibility)} disabled={busy}>
          <option value="private">Privat</option><option value="unlisted">Per Link</option><option value="public">Öffentlich</option>
        </select>
        <button class="primary" onclick={openPicker}>+ Karten hinzufügen</button>
      {/if}
    </div>
  </div>

  <h2 class="sctitle">{sc.name}</h2>
  {#if sc.description}<p class="scdesc">{sc.description}</p>{/if}
  <div class="smeta">{cards.length} Karten · <span class="vis">{VIS[sc.visibility]}</span> · <button class="likebtn" class:on={(sc.my_reactions ?? []).includes('like')} onclick={() => like(sc!)}>♥ {sc.like_count ?? 0}</button></div>

  {#if showPicker}
    <div class="picker">
      <div class="pickhead"><b>Aus deiner Sammlung hinzufügen</b><button class="ghost" onclick={() => (showPicker = false)}>schließen</button></div>
      <div class="pgrid">
        {#each myColl as c (c.id)}
          <button class="pcard" onclick={() => addCard(c)} title="Hinzufügen">
            {#if c.image_url}<img src={c.image_url} alt="" loading="lazy" />{:else}<div class="noimg">?</div>{/if}
            <div class="pn">{c.name}</div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="grid">
    {#each cards as c (c.id)}
      <div class="card">
        <span class="tag {c.game}">{GAME_LABEL[c.game] ?? c.game}</span>
        {#if c.image_url}<img src={c.image_url} alt="" loading="lazy" />{:else}<div class="ph">kein Bild</div>{/if}
        <div class="meta">
          <div class="name">{c.name}</div>
          <div class="set"><Flag lang={c.language} />{c.set_name ?? ''}</div>
        </div>
        {#if sc.is_mine}<div class="card-actions"><button class="del2" onclick={() => removeCard(c.id)}>Entfernen</button></div>{/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .coll-head { display: flex; align-items: center; justify-content: space-between; margin: 8px 0 14px; gap: 12px; flex-wrap: wrap; }
  .modes { display: flex; gap: 6px; }
  .modes button { padding: 8px 18px; border-radius: 999px; border: 1px solid #2a2f3a; background: transparent; color: inherit; font-weight: 600; cursor: pointer; }
  .modes button.active { background: var(--accent, #6366f1); border-color: transparent; color: #fff; }
  .right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .primary { padding: 8px 14px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
  .ghost { padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; }
  select { padding: 8px 10px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: inherit; }
  .addform { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 16px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 10px; }
  .addform label { display: flex; flex-direction: column; gap: 3px; font-size: 0.82rem; color: var(--muted); }
  .addform input, .addform textarea, .addform select { padding: 8px 10px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
  .sgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
  .scard { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; overflow: hidden; }
  .cover { display: block; width: 100%; border: 0; background: #0a0c10; cursor: pointer; padding: 0; }
  .cover img { width: 100%; height: 120px; object-fit: cover; display: block; }
  .noimg { height: 120px; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #2a2f3a; }
  .sbody { padding: 12px 14px; }
  .sname { background: none; border: 0; padding: 0; color: inherit; font-weight: 700; font-size: 1rem; cursor: pointer; text-align: left; }
  .smeta { color: var(--muted); font-size: 0.8rem; margin-top: 4px; }
  .vis { color: var(--accent, #6366f1); }
  .sauthor { color: var(--muted); font-size: 0.78rem; margin-top: 2px; }
  .sactions { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
  .likebtn { background: none; border: 1px solid #2a2f3a; border-radius: 999px; padding: 3px 10px; color: var(--muted); cursor: pointer; font: inherit; font-size: 0.8rem; }
  .likebtn.on { color: #fca5a5; border-color: #3a1620; }
  .del { background: none; border: 0; color: #fca5a5; cursor: pointer; font-size: 0.8rem; margin-left: auto; }
  .sctitle { margin: 6px 0; } .scdesc { color: var(--muted); margin: 4px 0 8px; }
  .picker { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 14px; margin: 12px 0; }
  .pickhead { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .pgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; max-height: 340px; overflow: auto; }
  .pcard { background: #12151d; border: 1px solid #2a2f3a; border-radius: 8px; padding: 5px; cursor: pointer; color: inherit; }
  .pcard img { width: 100%; aspect-ratio: 5/7; object-fit: contain; border-radius: 4px; }
  .pcard .pn { font-size: 0.68rem; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-actions .del2 { flex: 1; padding: 8px; border: 0; border-top: 1px solid var(--border, #2a2f3a); background: transparent; color: #fca5a5; cursor: pointer; font-size: 0.8rem; }
</style>
