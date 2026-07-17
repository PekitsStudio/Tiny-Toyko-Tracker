<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listMyShowcases, discoverShowcases, getShowcaseCards, createShowcase, deleteShowcase,
    updateShowcase, addCardsToShowcase, removeShowcaseCard, toggleReaction, toggleFollow,
    listShowcaseComments, addShowcaseComment, deleteShowcaseComment,
    type Showcase, type ShowcaseCard, type Visibility, type ShowcaseComment, type ReactionKind
  } from '$lib/services/showcase.service';
  import { listCards, type CollectionCard } from '$lib/services/collection.service';
  import { GAME_LABEL } from '$lib/format';
  import { auth } from '$lib/stores/auth.svelte';
  import { profileView } from '$lib/stores/profileview.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import CountryFlag from '$lib/components/CountryFlag.svelte';
  import ImageUpload from '$lib/components/ImageUpload.svelte';

  const REACTIONS: { kind: ReactionKind; emoji: string; countKey: 'like_count' | 'fire_count' | 'gem_count' | 'save_count' }[] = [
    { kind: 'like', emoji: '❤️', countKey: 'like_count' },
    { kind: 'fire', emoji: '🔥', countKey: 'fire_count' },
    { kind: 'gem', emoji: '💎', countKey: 'gem_count' },
    { kind: 'save', emoji: '⭐', countKey: 'save_count' }
  ];

  let { only }: { only?: 'meine' | 'entdecken' } = $props();

  const VIS: Record<Visibility, string> = { private: '🔒 Privat', unlisted: '🔗 Nicht gelistet', public: '🌍 Öffentlich' };
  let mode = $state<'meine' | 'entdecken'>(only ?? 'meine');
  let list = $state<Showcase[]>([]);
  let status = $state(''); let loading = $state(false); let busy = $state(false);

  let sc = $state<Showcase | null>(null);
  let cards = $state<ShowcaseCard[]>([]);
  let comments = $state<ShowcaseComment[]>([]);
  let newComment = $state(''); let commentBusy = $state(false);
  let coverDraft = $state('');

  let showCreate = $state(false);
  let cf = $state({ name: '', description: '', visibility: 'public' as Visibility, game: '', cover: '' });

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
    sc = s; showPicker = false; comments = []; newComment = ''; coverDraft = s.cover ?? '';
    try { cards = await getShowcaseCards(s.id); } catch (e) { status = (e as Error).message; }
    try { comments = await listShowcaseComments(s.id); } catch { comments = []; }
  }
  function back() { sc = null; comments = []; loadList(); }

  async function follow(s: Showcase) {
    const wasFollowed = !!s.followed;
    try {
      await toggleFollow(s.id, wasFollowed);
      s.followed = !wasFollowed;
      s.follower_count = (s.follower_count ?? 0) + (wasFollowed ? -1 : 1);
      list = [...list]; if (sc?.id === s.id) sc = { ...s };
    } catch (e) { status = (e as Error).message; }
  }
  async function sendComment() {
    if (!sc || !newComment.trim()) return; commentBusy = true;
    try {
      await addShowcaseComment(sc.id, newComment.trim());
      newComment = ''; comments = await listShowcaseComments(sc.id);
      sc.comment_count = (sc.comment_count ?? 0) + 1; sc = { ...sc };
    } catch (e) { status = (e as Error).message; } finally { commentBusy = false; }
  }
  async function removeComment(id: number) {
    if (!sc) return;
    try {
      await deleteShowcaseComment(id);
      comments = comments.filter((x) => x.id !== id);
      sc.comment_count = Math.max(0, (sc.comment_count ?? 1) - 1); sc = { ...sc };
    } catch (e) { status = (e as Error).message; }
  }
  function cdt(iso: string) { try { return new Date(iso).toLocaleDateString('de-DE'); } catch { return ''; } }

  async function doCreate() {
    if (!cf.name.trim()) return; busy = true;
    try { const s = await createShowcase({ name: cf.name.trim(), description: cf.description || null, visibility: cf.visibility, game: cf.game || null, cover_url: cf.cover || null }); showCreate = false; cf = { name: '', description: '', visibility: 'public', game: '', cover: '' }; await loadList(); await open({ ...s, card_count: 0 } as Showcase); }
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
  async function saveCover() {
    if (!sc) return; busy = true;
    try { await updateShowcase(sc.id, { cover_url: coverDraft || null }); sc.cover = coverDraft || null; sc = { ...sc }; }
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
  async function react(s: Showcase, kind: ReactionKind, countKey: 'like_count' | 'fire_count' | 'gem_count' | 'save_count') {
    const on = (s.my_reactions ?? []).includes(kind);
    try {
      await toggleReaction(s.id, kind, on);
      s[countKey] = Math.max(0, (s[countKey] ?? 0) + (on ? -1 : 1));
      s.my_reactions = on ? (s.my_reactions ?? []).filter((k) => k !== kind) : [...(s.my_reactions ?? []), kind];
      list = [...list]; if (sc?.id === s.id) sc = { ...s };
    } catch (e) { status = (e as Error).message; }
  }
  async function share(s: Showcase) {
    const url = `${location.origin}${location.pathname}#/c/${s.id}`;
    try { await navigator.clipboard.writeText(url); status = 'Link kopiert ✓'; setTimeout(() => (status = ''), 2500); }
    catch { window.prompt('Link kopieren:', url); }
  }
  function openOwner(s: Showcase) {
    if (!s.user_id || s.is_mine) return;
    sc = null; profileView.open(s.user_id);
  }
  function cdtime(iso: string) {
    try { return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
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
      <div class="coverfield"><span class="cf-l">Cover (optional)</span><ImageUpload bind:value={cf.cover} folder="covers" /></div>
      <button class="primary" onclick={doCreate} disabled={busy || !cf.name.trim()}>Erstellen</button>
    </div>
  {/if}

  {#if status}<div class="hint">{status}</div>{/if}

  <div class="sgrid">
    {#each list as s (s.id)}
      <div class="scard">
        <button class="cover" onclick={() => open(s)}>
          {#if s.cover}<img src={s.cover} alt="" loading="lazy" />{:else}<div class="noimg">📚</div>{/if}
          <span class="col-vis">{VIS[s.visibility]}</span>
        </button>
        <div class="sbody">
          <button class="sname" onclick={() => open(s)}>{s.name}</button>
          <div class="smeta">{s.card_count} Karten · ❤️ {s.like_count ?? 0} · 💬 {s.comment_count ?? 0}{#if s.follower_count} · 🔔 {s.follower_count}{/if}</div>
          <div class="sauthor"><CountryFlag country={s.author_country} />{s.author_name ?? 'Sammler'}</div>
          {#if s.is_mine}<div class="sactions"><button class="del" onclick={() => del(s)}>Löschen</button></div>{/if}
        </div>
      </div>
    {/each}
  </div>
{:else}
  <!-- Detailansicht -->
  <button class="ghost backbtn" onclick={back}>← zurück</button>

  <div class="col-hero">
    {#if sc.cover}<img src={sc.cover} alt="" />{/if}
    <div class="col-hero-ov"></div>
    <div class="col-hero-txt">
      <span class="col-vis-b">{VIS[sc.visibility]}</span>
      <h2>{sc.name}</h2>
      <button class="col-hero-owner" onclick={() => openOwner(sc!)} disabled={sc.is_mine}><CountryFlag country={sc.author_country} />{sc.author_name ?? 'Sammler'}</button>
    </div>
  </div>

  {#if sc.description}<p class="col-desc">{sc.description}</p>{/if}
  <div class="col-stats">{cards.length} Karten · 💬 {sc.comment_count ?? 0} · 🔔 {sc.follower_count ?? 0} Follower{#if sc.created_at} · erstellt {new Date(sc.created_at).toLocaleDateString('de-DE')}{/if}</div>

  <div class="col-actions">
    {#each REACTIONS as r}
      <button class="col-react" class:on={(sc.my_reactions ?? []).includes(r.kind)} onclick={() => react(sc!, r.kind, r.countKey)}>{r.emoji} {sc[r.countKey] ?? 0}</button>
    {/each}
    {#if !sc.is_mine}<button class="col-follow" class:on={sc.followed} onclick={() => follow(sc!)}>{sc.followed ? '🔔 Folge ich' : '🔔 Folgen'}</button>{/if}
    <button class="ghost" onclick={() => share(sc!)}>📤 Link</button>
    {#if sc.is_mine}
      <button class="primary" onclick={openPicker}>+ Karten</button>
      <select value={sc.visibility} onchange={(e) => setVis((e.currentTarget as HTMLSelectElement).value as Visibility)} disabled={busy}>
        <option value="private">Privat</option><option value="unlisted">Per Link</option><option value="public">Öffentlich</option>
      </select>
      <button class="ghost danger" onclick={() => del(sc!)}>Löschen</button>
    {/if}
  </div>

  {#if sc.is_mine}
    <div class="coverbox">
      <span class="cf-l">Cover-Bild</span>
      <ImageUpload bind:value={coverDraft} folder="covers" />
      <button class="ghost coversave" onclick={saveCover} disabled={busy}>Cover speichern</button>
    </div>
  {/if}

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

  <div class="cmsection">
    <h3 class="cmh">💬 Kommentare ({comments.length})</h3>
    {#each comments as cm (cm.id)}
      <div class="dt-comment">
        <div class="dc-head"><CountryFlag country={cm.author_country} /><b>{cm.author_name ?? 'Sammler'}</b> · {cdtime(cm.created_at)}{#if auth.user?.id === cm.user_id}<button class="cmdel" onclick={() => removeComment(cm.id)} title="Löschen">✕</button>{/if}</div>
        <div class="dc-body">{cm.body}</div>
      </div>
    {/each}
    {#if !comments.length}<div class="hint">Noch keine Kommentare.</div>{/if}
    <div class="cadd">
      <input placeholder="Kommentieren…" bind:value={newComment} onkeydown={(e) => { if (e.key === 'Enter') sendComment(); }} />
      <button class="primary" onclick={sendComment} disabled={commentBusy || !newComment.trim()}>Senden</button>
    </div>
  </div>
{/if}

<style>
  .coll-head { display: flex; align-items: center; justify-content: space-between; margin: 8px 0 14px; gap: 12px; flex-wrap: wrap; }
  .modes { display: flex; gap: 6px; }
  .modes button { padding: 8px 18px; border-radius: 999px; border: 1px solid #2a2f3a; background: transparent; color: inherit; font-weight: 600; cursor: pointer; }
  .modes button.active { background: var(--accent, #6366f1); border-color: transparent; color: #fff; }
  .primary { padding: 8px 14px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
  .ghost { padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; }
  select { padding: 8px 10px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: inherit; }
  .addform { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 16px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 10px; }
  .addform label { display: flex; flex-direction: column; gap: 3px; font-size: 0.82rem; color: var(--muted); }
  .coverfield, .coverbox { display: flex; flex-direction: column; gap: 6px; }
  .coverbox { margin: 4px 0 16px; }
  .cf-l { font-size: 0.82rem; color: var(--muted); }
  .coversave { align-self: flex-start; }
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
  .cover { position: relative; }
  .col-vis { position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.2); border-radius: 999px; padding: 3px 9px; font-size: 0.68rem; font-weight: 700; color: #fff; }
  .sauthor { display: flex; align-items: center; color: var(--muted); font-size: 0.78rem; margin-top: 4px; }
  .sactions { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
  .del { background: none; border: 0; color: #fca5a5; cursor: pointer; font-size: 0.8rem; margin-left: auto; }

  /* Detail-Hero + Aktionen (Vorbild alte App) */
  .backbtn { margin: 4px 0 12px; }
  .col-hero { position: relative; height: 180px; border-radius: 14px; overflow: hidden; background: linear-gradient(135deg, var(--accent, #6366f1), #8b5cf6); }
  .col-hero img { width: 100%; height: 100%; object-fit: cover; }
  .col-hero-ov { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.15) 60%, transparent); }
  .col-hero-txt { position: absolute; left: 18px; right: 18px; bottom: 14px; color: #fff; }
  .col-hero-txt h2 { margin: 6px 0 2px; font-size: 1.6rem; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
  .col-vis-b { background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.25); border-radius: 999px; padding: 3px 10px; font-size: 0.72rem; font-weight: 700; }
  .col-hero-owner { display: inline-flex; align-items: center; background: none; border: 0; padding: 0; color: #fff; font: inherit; font-size: 0.85rem; opacity: 0.95; cursor: pointer; }
  .col-hero-owner:disabled { cursor: default; }
  .col-desc { margin: 14px 0 6px; white-space: pre-wrap; }
  .col-stats { color: var(--muted); font-size: 0.82rem; margin: 8px 0 12px; }
  .col-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; align-items: center; }
  .col-react { background: #12151d; border: 1px solid #2a2f3a; color: var(--text, #e7e9ee); border-radius: 999px; padding: 8px 13px; font-size: 0.85rem; cursor: pointer; }
  .col-react:hover { border-color: var(--accent, #6366f1); }
  .col-react.on { background: rgba(99,102,241,0.18); border-color: var(--accent, #6366f1); color: #c7c9ff; }
  .col-follow { background: #12151d; border: 1px solid #2a2f3a; color: var(--text, #e7e9ee); border-radius: 999px; padding: 8px 13px; font-size: 0.85rem; cursor: pointer; }
  .col-follow.on { background: var(--accent, #6366f1); border-color: transparent; color: #fff; }
  .ghost.danger { color: #fca5a5; border-color: #3a1620; }

  .picker { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 14px; margin: 12px 0; }
  .pickhead { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .pgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; max-height: 340px; overflow: auto; }
  .pcard { background: #12151d; border: 1px solid #2a2f3a; border-radius: 8px; padding: 5px; cursor: pointer; color: inherit; }
  .pcard img { width: 100%; aspect-ratio: 5/7; object-fit: contain; border-radius: 4px; }
  .pcard .pn { font-size: 0.68rem; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-actions .del2 { flex: 1; padding: 8px; border: 0; border-top: 1px solid var(--border, #2a2f3a); background: transparent; color: #fca5a5; cursor: pointer; font-size: 0.8rem; }

  .cmsection { margin-top: 18px; border-top: 1px solid #232833; padding-top: 14px; display: flex; flex-direction: column; gap: 8px; }
  .cmh { margin: 0 0 4px; font-size: 1rem; }
  .dt-comment { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 10px; padding: 10px 12px; }
  .dc-head { display: flex; align-items: center; font-size: 0.78rem; color: var(--muted); margin-bottom: 3px; }
  .dc-head b { color: var(--accent, #6366f1); margin-right: 4px; }
  .cmdel { margin-left: auto; background: none; border: 0; color: #fca5a5; cursor: pointer; }
  .dc-body { white-space: pre-wrap; word-break: break-word; font-size: 0.9rem; }
  .cadd { display: flex; gap: 8px; margin-top: 4px; }
  .cadd input { flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: inherit; font: inherit; }
  .hint { color: var(--muted, #9aa0ad); font-size: 0.85rem; }

  @media (max-width: 560px) {
    .sgrid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .col-hero { height: 150px; }
    .col-hero-txt h2 { font-size: 1.3rem; }
    .col-actions { gap: 6px; }
    .col-react, .col-follow, .col-actions .ghost, .col-actions .primary { padding: 8px 11px; font-size: 0.82rem; }
  }
</style>
