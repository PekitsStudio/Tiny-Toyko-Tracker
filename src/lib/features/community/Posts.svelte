<script lang="ts">
  import { onMount } from 'svelte';
  import { listPosts, createPost, deletePost, toggleLikePost, listPostComments, addPostComment, type Post, type PostComment, type PostKind } from '$lib/services/community.service';
  import { auth } from '$lib/stores/auth.svelte';

  let { kind, label }: { kind: PostKind; label: string } = $props();

  let posts = $state<Post[]>([]);
  let status = $state(''); let loading = $state(false); let busy = $state(false);
  let showCreate = $state(false);
  let cf = $state({ title: '', body: '', image_url: '' });

  let openComments = $state<number | null>(null);
  let comments = $state<PostComment[]>([]);
  let newComment = $state('');

  async function load() {
    loading = true; status = '';
    try { posts = await listPosts(kind); if (!posts.length) status = `Noch keine ${label}.`; }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(load);

  function dt(iso: string) { try { return new Date(iso).toLocaleDateString('de-DE'); } catch { return ''; } }

  async function submit() {
    if (!cf.title.trim() || !cf.body.trim()) return; busy = true;
    try { await createPost({ kind, title: cf.title.trim(), body: cf.body.trim(), image_url: cf.image_url || null }); cf = { title: '', body: '', image_url: '' }; showCreate = false; await load(); }
    catch (e) { status = (e as Error).message; } finally { busy = false; }
  }
  async function like(p: Post) {
    const wasLiked = p.liked;
    p.liked = !wasLiked; p.like_count += wasLiked ? -1 : 1; posts = [...posts];
    try { await toggleLikePost(p.id, wasLiked); } catch { p.liked = wasLiked; p.like_count += wasLiked ? 1 : -1; posts = [...posts]; }
  }
  async function toggleComments(p: Post) {
    if (openComments === p.id) { openComments = null; return; }
    openComments = p.id; comments = []; newComment = '';
    try { comments = await listPostComments(p.id); } catch (e) { status = (e as Error).message; }
  }
  async function sendComment(p: Post) {
    if (!newComment.trim()) return;
    try { await addPostComment(p.id, newComment.trim()); newComment = ''; comments = await listPostComments(p.id); p.comment_count++; posts = [...posts]; }
    catch (e) { status = (e as Error).message; }
  }
  async function del(p: Post) {
    if (!confirm('Beitrag löschen?')) return;
    try { await deletePost(p.id); posts = posts.filter((x) => x.id !== p.id); } catch (e) { status = (e as Error).message; }
  }
</script>

<div class="head">
  <h2>{label}</h2>
  <button class="primary" onclick={() => (showCreate = !showCreate)}>{showCreate ? 'Abbrechen' : '+ Neuer Beitrag'}</button>
</div>

{#if showCreate}
  <div class="form">
    <input placeholder="Titel" bind:value={cf.title} />
    <textarea rows="4" placeholder="Dein Beitrag…" bind:value={cf.body}></textarea>
    <input placeholder="Bild-URL (optional)" bind:value={cf.image_url} />
    <button class="primary" onclick={submit} disabled={busy || !cf.title.trim() || !cf.body.trim()}>Veröffentlichen</button>
  </div>
{/if}

{#if status}<div class="hint">{status}</div>{/if}

<div class="list">
  {#each posts as p (p.id)}
    <div class="post">
      <div class="ptop">
        <div><div class="pt">{p.title}</div><div class="pmeta">von {p.author_name ?? 'Sammler'} · {dt(p.created_at)}</div></div>
        {#if auth.user?.id === p.user_id}<button class="del" onclick={() => del(p)} title="Löschen">✕</button>{/if}
      </div>
      {#if p.image_url}<img class="pimg" src={p.image_url} alt="" loading="lazy" />{/if}
      <div class="pbody">{p.body}</div>
      <div class="pactions">
        <button class="likebtn" class:on={p.liked} onclick={() => like(p)}>♥ {p.like_count}</button>
        <button class="cbtn" onclick={() => toggleComments(p)}>💬 {p.comment_count}</button>
      </div>
      {#if openComments === p.id}
        <div class="comments">
          {#each comments as c (c.id)}
            <div class="cm"><b>{c.author_name ?? 'Sammler'}</b> {c.body}</div>
          {/each}
          <div class="cadd">
            <input placeholder="Kommentar…" bind:value={newComment} onkeydown={(e) => { if (e.key === 'Enter') sendComment(p); }} />
            <button onclick={() => sendComment(p)}>Senden</button>
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .head { display: flex; align-items: center; justify-content: space-between; margin: 4px 0 14px; gap: 12px; flex-wrap: wrap; }
  .head h2 { margin: 0; }
  .primary { padding: 8px 14px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
  .form { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 16px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 10px; }
  .form input, .form textarea { padding: 9px 11px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .form .primary { align-self: flex-start; }
  .list { display: flex; flex-direction: column; gap: 12px; }
  .post { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 16px; }
  .ptop { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .pt { font-weight: 700; font-size: 1.05rem; }
  .pmeta { color: var(--muted, #9aa0ad); font-size: 0.8rem; margin-top: 2px; }
  .del { background: none; border: 0; color: #fca5a5; cursor: pointer; }
  .pimg { max-width: 100%; max-height: 340px; object-fit: contain; border-radius: 8px; margin: 10px 0; background: #0a0c10; }
  .pbody { white-space: pre-wrap; margin: 8px 0; line-height: 1.55; }
  .pactions { display: flex; gap: 10px; margin-top: 6px; }
  .likebtn, .cbtn { background: none; border: 1px solid #2a2f3a; border-radius: 999px; padding: 4px 12px; color: var(--muted); cursor: pointer; font: inherit; font-size: 0.82rem; }
  .likebtn.on { color: #fca5a5; border-color: #3a1620; }
  .comments { margin-top: 12px; border-top: 1px solid #2a2f3a; padding-top: 10px; display: flex; flex-direction: column; gap: 8px; }
  .cm { font-size: 0.88rem; } .cm b { color: var(--accent, #6366f1); }
  .cadd { display: flex; gap: 8px; }
  .cadd input { flex: 1; padding: 7px 10px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: inherit; }
  .cadd button { padding: 7px 12px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; cursor: pointer; }
  .hint { color: var(--muted, #9aa0ad); margin: 8px 0; }
</style>
