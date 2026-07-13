<script lang="ts">
  import { onMount } from 'svelte';
  import { listMessages, sendMessage, markRead, searchUsers, type Message, type FoundUser } from '$lib/services/social.service';
  import { auth } from '$lib/stores/auth.svelte';
  import { social } from '$lib/stores/social.svelte';

  let msgs = $state<Message[]>([]);
  let status = $state(''); let loading = $state(false);
  let selected = $state<{ id: string; name: string } | null>(null);
  let text = $state('');
  let query = $state(''); let results = $state<FoundUser[]>([]); let searching = $state(false);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const myId = $derived(auth.user?.id ?? '');

  interface Convo { id: string; name: string; msgs: Message[]; last: string; lastAt: string; unread: number; }
  const convos = $derived.by<Convo[]>(() => {
    const map = new Map<string, Convo>();
    for (const m of msgs) {
      const oid = m.incoming ? m.from_user : m.to_user;
      const oname = (m.incoming ? m.from_name : m.to_name) ?? 'Sammler';
      let c = map.get(oid);
      if (!c) { c = { id: oid, name: oname, msgs: [], last: '', lastAt: '', unread: 0 }; map.set(oid, c); }
      c.msgs.push(m);
      if (m.incoming && !m.read) c.unread++;
    }
    return [...map.values()].map((c) => ({ ...c, last: c.msgs[c.msgs.length - 1]?.body ?? '', lastAt: c.msgs[c.msgs.length - 1]?.created_at ?? '' }))
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  });
  const thread = $derived(selected ? msgs.filter((m) => m.from_user === selected!.id || m.to_user === selected!.id) : []);

  async function load() {
    loading = true; status = '';
    try { msgs = await listMessages(); }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(async () => {
    await load();
    if (social.chatWith) { selected = { ...social.chatWith }; social.clear(); await openSelected(); }
  });

  async function openSelected() {
    if (!selected) return;
    const unread = msgs.filter((m) => m.incoming && !m.read && m.from_user === selected!.id).map((m) => m.id);
    if (unread.length) { try { await markRead(unread); await load(); } catch { /* ignore */ } }
  }
  async function select(c: Convo) { selected = { id: c.id, name: c.name }; await openSelected(); }

  async function send() {
    if (!selected || !text.trim()) return;
    const body = text.trim(); text = '';
    try { await sendMessage(selected.id, body); await load(); } catch (e) { status = (e as Error).message; }
  }

  function onSearch() {
    clearTimeout(searchTimer);
    const q = query.trim();
    if (q.length < 2) { results = []; return; }
    searching = true;
    searchTimer = setTimeout(async () => {
      try { results = (await searchUsers(q)).filter((u) => u.user_id !== myId); } catch { results = []; }
      finally { searching = false; }
    }, 350);
  }
  function pick(u: FoundUser) { selected = { id: u.user_id, name: u.name ?? 'Sammler' }; query = ''; results = []; }
  function dt(iso: string) { try { return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }); } catch { return ''; } }
</script>

<div class="wrap">
  <div class="sidebar">
    <div class="compose">
      <input placeholder="Nutzer suchen…" bind:value={query} oninput={onSearch} />
      {#if searching}<div class="muted small">suche…</div>{/if}
      {#if results.length}
        <div class="results">
          {#each results as u (u.user_id)}<button onclick={() => pick(u)}>{u.name ?? 'Sammler'}{#if u.country} · {u.country}{/if}</button>{/each}
        </div>
      {/if}
    </div>
    {#if status}<div class="hint">{status}</div>{/if}
    <div class="convos">
      {#each convos as c (c.id)}
        <button class="convo" class:active={selected?.id === c.id} onclick={() => select(c)}>
          <div class="cn">{c.name}{#if c.unread}<span class="dot">{c.unread}</span>{/if}</div>
          <div class="cl">{c.last}</div>
        </button>
      {/each}
      {#if !convos.length && !loading}<div class="muted small">Noch keine Nachrichten.</div>{/if}
    </div>
  </div>

  <div class="thread">
    {#if selected}
      <div class="thead">{selected.name}</div>
      <div class="tbody">
        {#each thread as m (m.id)}
          <div class="bubble" class:mine={!m.incoming}>
            {#if m.card_name}<div class="card-ref">🃏 {m.card_name}</div>{/if}
            <div class="btxt">{m.body}</div>
            <div class="bt">{dt(m.created_at)}</div>
          </div>
        {/each}
      </div>
      <div class="reply">
        <input placeholder="Nachricht…" bind:value={text} onkeydown={(e) => { if (e.key === 'Enter') send(); }} />
        <button onclick={send} disabled={!text.trim()}>Senden</button>
      </div>
    {:else}
      <div class="empty">Wähle links eine Unterhaltung oder suche einen Nutzer.</div>
    {/if}
  </div>
</div>

<style>
  .wrap { display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; }
  .sidebar { width: 280px; max-width: 100%; display: flex; flex-direction: column; gap: 10px; }
  .compose input, .reply input { width: 100%; padding: 9px 11px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: inherit; }
  .results { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
  .results button { text-align: left; padding: 8px 10px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: inherit; cursor: pointer; }
  .convos { display: flex; flex-direction: column; gap: 6px; }
  .convo { text-align: left; background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 10px; padding: 10px 12px; cursor: pointer; color: inherit; }
  .convo.active { border-color: var(--accent, #6366f1); }
  .cn { font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .dot { background: var(--accent, #6366f1); color: #fff; border-radius: 999px; font-size: 0.7rem; padding: 0 7px; }
  .cl { color: var(--muted); font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .thread { flex: 1; min-width: 280px; background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; display: flex; flex-direction: column; min-height: 400px; max-height: 70vh; }
  .thead { padding: 12px 16px; border-bottom: 1px solid #232833; font-weight: 700; }
  .tbody { flex: 1; overflow: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
  .bubble { max-width: 75%; align-self: flex-start; background: #12151d; border: 1px solid #2a2f3a; border-radius: 12px; padding: 8px 12px; }
  .bubble.mine { align-self: flex-end; background: var(--accent, #6366f1); color: #fff; border-color: transparent; }
  .card-ref { font-size: 0.75rem; opacity: 0.85; margin-bottom: 2px; }
  .btxt { white-space: pre-wrap; }
  .bt { font-size: 0.68rem; opacity: 0.7; margin-top: 3px; }
  .reply { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #232833; }
  .reply button { padding: 9px 16px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; cursor: pointer; }
  .empty { padding: 30px; color: var(--muted); text-align: center; margin: auto; }
  .muted { color: var(--muted, #9aa0ad); } .small { font-size: 0.8rem; }
  .hint { color: var(--muted, #9aa0ad); }
</style>
