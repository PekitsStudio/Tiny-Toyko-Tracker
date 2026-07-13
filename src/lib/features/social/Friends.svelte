<script lang="ts">
  import { onMount } from 'svelte';
  import { listFriends, sendFriendRequest, acceptFriend, removeFriend, searchUsers, type Friend, type FoundUser } from '$lib/services/social.service';
  import { social } from '$lib/stores/social.svelte';
  import { auth } from '$lib/stores/auth.svelte';

  let friends = $state<Friend[]>([]);
  let status = $state(''); let loading = $state(false); let msg = $state('');
  let query = $state(''); let results = $state<FoundUser[]>([]); let searching = $state(false);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const incoming = $derived(friends.filter((f) => f.incoming));
  const outgoing = $derived(friends.filter((f) => f.outgoing));
  const accepted = $derived(friends.filter((f) => f.status === 'accepted'));

  async function load() {
    loading = true; status = '';
    try { friends = await listFriends(); }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(load);

  function onSearch() {
    clearTimeout(searchTimer);
    const q = query.trim();
    if (q.length < 2) { results = []; return; }
    searching = true;
    searchTimer = setTimeout(async () => {
      try { results = (await searchUsers(q)).filter((u) => u.user_id !== auth.user?.id); } catch { results = []; }
      finally { searching = false; }
    }, 350);
  }
  async function add(u: FoundUser) {
    msg = '';
    try { await sendFriendRequest(u.user_id); msg = `Anfrage an ${u.name ?? 'Sammler'} gesendet.`; query = ''; results = []; await load(); }
    catch (e) { msg = (e as Error).message; }
  }
  async function accept(f: Friend) { try { await acceptFriend(f.id); await load(); } catch (e) { status = (e as Error).message; } }
  async function remove(f: Friend) { try { await removeFriend(f.id); friends = friends.filter((x) => x.id !== f.id); } catch (e) { status = (e as Error).message; } }
  function message(f: Friend) { social.openChat(f.otherId, f.name ?? 'Sammler'); }
</script>

<h2>Freunde</h2>

<div class="search">
  <input placeholder="Freund nach Namen suchen…" bind:value={query} oninput={onSearch} />
  {#if searching}<span class="muted small">suche…</span>{/if}
  {#if msg}<span class="msg">{msg}</span>{/if}
</div>
{#if results.length}
  <div class="results">
    {#each results as u (u.user_id)}
      <div class="rrow"><span>{u.name ?? 'Sammler'}{#if u.country} · {u.country}{/if}</span><button class="primary" onclick={() => add(u)}>+ Freund</button></div>
    {/each}
  </div>
{/if}

{#if status}<div class="hint">{status}</div>{/if}

{#if incoming.length}
  <h3>Eingehende Anfragen</h3>
  <div class="list">
    {#each incoming as f (f.id)}
      <div class="frow"><span class="fn">{f.name ?? 'Sammler'}</span><div class="fa"><button class="primary" onclick={() => accept(f)}>Annehmen</button><button class="danger" onclick={() => remove(f)}>Ablehnen</button></div></div>
    {/each}
  </div>
{/if}

<h3>Freunde ({accepted.length})</h3>
{#if !accepted.length && !loading}<div class="muted">Noch keine Freunde.</div>{/if}
<div class="list">
  {#each accepted as f (f.id)}
    <div class="frow"><span class="fn">{f.name ?? 'Sammler'}{#if f.country} · {f.country}{/if}</span><div class="fa"><button onclick={() => message(f)}>Nachricht</button><button class="danger" onclick={() => remove(f)}>Entfernen</button></div></div>
  {/each}
</div>

{#if outgoing.length}
  <h3>Gesendete Anfragen</h3>
  <div class="list">
    {#each outgoing as f (f.id)}
      <div class="frow"><span class="fn">{f.name ?? 'Sammler'}</span><div class="fa"><span class="muted small">wartet…</span><button class="danger" onclick={() => remove(f)}>Zurückziehen</button></div></div>
    {/each}
  </div>
{/if}

<style>
  h2 { margin: 4px 0 14px; } h3 { margin: 22px 0 10px; font-size: 1.05rem; }
  .search { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .search input { padding: 9px 11px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: inherit; min-width: 240px; }
  .results { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
  .rrow, .frow { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 10px; padding: 10px 14px; }
  .fn { font-weight: 600; }
  .fa { display: flex; gap: 8px; }
  .fa button, .primary { padding: 7px 12px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; }
  .primary { background: var(--accent, #6366f1); border-color: transparent; color: #fff; font-weight: 600; }
  .danger { color: #fca5a5; }
  .list { display: flex; flex-direction: column; gap: 6px; }
  .muted { color: var(--muted, #9aa0ad); } .small { font-size: 0.8rem; } .msg { color: #86efac; font-size: 0.85rem; }
  .hint { color: var(--muted, #9aa0ad); margin: 8px 0; }
</style>
