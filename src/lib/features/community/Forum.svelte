<script lang="ts">
  import { onMount } from 'svelte';
  import { listThreads, createThread, deleteThread, listThreadReplies, addThreadReply, type ForumThread, type ForumReply, type ForumCategory } from '$lib/services/community.service';
  import { auth } from '$lib/stores/auth.svelte';

  const CATS: [ForumCategory | '', string][] = [['', 'Alle'], ['general', 'Allgemein'], ['pokemon', 'Pokémon'], ['magic', 'Magic'], ['yugioh', 'Yu-Gi-Oh'], ['onepiece', 'One Piece'], ['offtopic', 'Offtopic']];

  let cat = $state<ForumCategory | ''>('');
  let threads = $state<ForumThread[]>([]);
  let status = $state(''); let loading = $state(false); let busy = $state(false);
  let showCreate = $state(false);
  let cf = $state({ category: 'general' as ForumCategory, title: '', body: '' });

  let openThread = $state<ForumThread | null>(null);
  let replies = $state<ForumReply[]>([]);
  let reply = $state('');

  async function load() {
    loading = true; status = ''; openThread = null;
    try { threads = await listThreads(cat || undefined); if (!threads.length) status = 'Noch keine Themen.'; }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(load);
  function dt(iso: string) { try { return new Date(iso).toLocaleDateString('de-DE'); } catch { return ''; } }
  function catLabel(c: string) { return (CATS.find(([id]) => id === c) ?? ['', c])[1]; }

  async function submit() {
    if (!cf.title.trim() || !cf.body.trim()) return; busy = true;
    try { await createThread({ category: cf.category, title: cf.title.trim(), body: cf.body.trim() }); cf = { category: 'general', title: '', body: '' }; showCreate = false; await load(); }
    catch (e) { status = (e as Error).message; } finally { busy = false; }
  }
  async function open(t: ForumThread) {
    openThread = t; replies = []; reply = '';
    try { replies = await listThreadReplies(t.id); } catch (e) { status = (e as Error).message; }
  }
  async function sendReply() {
    if (!openThread || !reply.trim()) return;
    try { await addThreadReply(openThread.id, reply.trim()); reply = ''; replies = await listThreadReplies(openThread.id); } catch (e) { status = (e as Error).message; }
  }
  async function del(t: ForumThread) {
    if (!confirm('Thema löschen?')) return;
    try { await deleteThread(t.id); threads = threads.filter((x) => x.id !== t.id); if (openThread?.id === t.id) openThread = null; } catch (e) { status = (e as Error).message; }
  }
</script>

{#if !openThread}
  <div class="head">
    <h2>Forum</h2>
    <button class="primary" onclick={() => (showCreate = !showCreate)}>{showCreate ? 'Abbrechen' : '+ Neues Thema'}</button>
  </div>
  <div class="cats">
    {#each CATS as [id, lbl]}<button class="chip" class:active={cat === id} onclick={() => { cat = id; load(); }}>{lbl}</button>{/each}
  </div>

  {#if showCreate}
    <div class="form">
      <select bind:value={cf.category}>{#each CATS.slice(1) as [id, lbl]}<option value={id}>{lbl}</option>{/each}</select>
      <input placeholder="Titel" bind:value={cf.title} />
      <textarea rows="4" placeholder="Worum geht's?" bind:value={cf.body}></textarea>
      <button class="primary" onclick={submit} disabled={busy || !cf.title.trim() || !cf.body.trim()}>Thema erstellen</button>
    </div>
  {/if}

  {#if status}<div class="hint">{status}</div>{/if}
  <div class="list">
    {#each threads as t (t.id)}
      <div class="thread">
        <button class="topen" onclick={() => open(t)}>
          <div class="tt">{t.title}</div>
          <div class="tmeta"><span class="badge">{catLabel(t.category)}</span> von {t.author_name ?? 'Sammler'} · {dt(t.last_activity)} · {t.reply_count} Antworten</div>
        </button>
        {#if auth.user?.id === t.user_id}<button class="del" onclick={() => del(t)}>✕</button>{/if}
      </div>
    {/each}
  </div>
{:else}
  <button class="ghost" onclick={load}>← zurück</button>
  <div class="thread-detail">
    <div class="badge">{catLabel(openThread.category)}</div>
    <h2>{openThread.title}</h2>
    <div class="tmeta">von {openThread.author_name ?? 'Sammler'} · {dt(openThread.created_at)}</div>
    <div class="tbody">{openThread.body}</div>
    <h3>Antworten ({replies.length})</h3>
    <div class="replies">
      {#each replies as r (r.id)}
        <div class="reply"><b>{r.author_name ?? 'Sammler'}</b> <span class="rd">{dt(r.created_at)}</span><div class="rb">{r.body}</div></div>
      {/each}
    </div>
    <div class="replyform">
      <textarea rows="3" placeholder="Antworten…" bind:value={reply}></textarea>
      <button class="primary" onclick={sendReply} disabled={!reply.trim()}>Antwort senden</button>
    </div>
  </div>
{/if}

<style>
  .head { display: flex; align-items: center; justify-content: space-between; margin: 4px 0 12px; gap: 12px; flex-wrap: wrap; }
  .head h2 { margin: 0; }
  .primary { padding: 8px 14px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
  .ghost { padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; margin-bottom: 12px; }
  .cats { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
  .chip { padding: 6px 12px; border-radius: 999px; border: 1px solid #2a2f3a; background: transparent; color: var(--muted); cursor: pointer; font-size: 0.82rem; }
  .chip.active { background: var(--accent, #6366f1); border-color: transparent; color: #fff; }
  .form { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 16px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 10px; }
  .form input, .form textarea, .form select { padding: 9px 11px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .form .primary { align-self: flex-start; }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .thread { display: flex; align-items: center; gap: 10px; background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 10px; padding: 4px 12px 4px 4px; }
  .topen { flex: 1; text-align: left; background: none; border: 0; color: inherit; cursor: pointer; padding: 12px; }
  .tt { font-weight: 600; } .tmeta { color: var(--muted); font-size: 0.8rem; margin-top: 3px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; border: 1px solid #2a2f3a; font-size: 0.72rem; color: var(--accent, #6366f1); }
  .del { background: none; border: 0; color: #fca5a5; cursor: pointer; }
  .thread-detail { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 18px; }
  .thread-detail h2 { margin: 8px 0 4px; }
  .tbody { white-space: pre-wrap; margin: 12px 0; line-height: 1.55; }
  .replies { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .reply { background: #12151d; border: 1px solid #2a2f3a; border-radius: 8px; padding: 10px 12px; }
  .reply b { color: var(--accent, #6366f1); } .rd { color: var(--muted); font-size: 0.75rem; margin-left: 6px; } .rb { white-space: pre-wrap; margin-top: 4px; }
  .replyform { display: flex; flex-direction: column; gap: 8px; }
  .replyform textarea { padding: 9px 11px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: inherit; font: inherit; }
  .replyform .primary { align-self: flex-start; }
  .hint { color: var(--muted, #9aa0ad); margin: 8px 0; }
</style>
