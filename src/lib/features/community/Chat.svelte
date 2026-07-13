<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { listChat, sendChat, subscribeChat, unsubscribeChat, CHAT_ROOMS, type ChatMessage, type ChatRoom } from '$lib/services/chat.service';
  import { auth } from '$lib/stores/auth.svelte';
  import type { RealtimeChannel } from '@supabase/supabase-js';

  let room = $state<ChatRoom>('general');
  let messages = $state<ChatMessage[]>([]);
  let text = $state('');
  let status = $state(''); let loading = $state(false); let busy = $state(false);
  let channel: RealtimeChannel | null = null;
  let box: HTMLDivElement | null = null;

  async function scrollDown() { await tick(); if (box) box.scrollTop = box.scrollHeight; }

  async function load() {
    loading = true; status = '';
    try {
      messages = await listChat(room);
      if (!messages.length) status = 'Noch keine Nachrichten – schreib die erste!';
      await scrollDown();
    } catch (e) {
      const m = (e as Error).message;
      status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden, um mitzuchatten.' : m;
    } finally { loading = false; }
  }

  function connect() {
    if (channel) { unsubscribeChat(channel); channel = null; }
    channel = subscribeChat(room, (m) => {
      if (messages.some((x) => x.id === m.id)) return;
      messages = [...messages, m];
      scrollDown();
    });
  }

  async function switchRoom(r: ChatRoom) {
    if (r === room) return;
    room = r; messages = []; status = '';
    await load(); connect();
  }

  async function send() {
    if (!text.trim() || busy) return;
    busy = true; const body = text.trim();
    try { await sendChat(room, body); text = ''; }
    catch (e) { status = (e as Error).message; } finally { busy = false; }
  }

  function time(iso: string) { try { return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }

  onMount(async () => { await load(); connect(); });
  onDestroy(() => { if (channel) unsubscribeChat(channel); });
</script>

<div class="rooms">
  {#each CHAT_ROOMS as r}
    <button class:active={room === r.id} onclick={() => switchRoom(r.id)}>{r.label}</button>
  {/each}
</div>

<div class="chatbox" bind:this={box}>
  {#if loading}<div class="hint">Lädt…</div>{/if}
  {#each messages as m (m.id)}
    <div class="msg" class:mine={auth.user?.id === m.user_id}>
      <div class="mhead"><b>{m.author_name ?? 'Sammler'}</b>{#if m.author_country}<span class="mcountry">{m.author_country}</span>{/if}<span class="mtime">{time(m.created_at)}</span></div>
      <div class="mbody">{m.body}</div>
    </div>
  {/each}
  {#if status && !messages.length}<div class="hint">{status}</div>{/if}
</div>

<div class="composer">
  <input placeholder="Nachricht schreiben…" bind:value={text} onkeydown={(e) => { if (e.key === 'Enter') send(); }} maxlength={1000} />
  <button class="send" onclick={send} disabled={busy || !text.trim()}>Senden</button>
</div>

<style>
  .rooms { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  .rooms button { padding: 6px 12px; border-radius: 999px; border: 1px solid #2a2f3a; background: transparent; color: var(--muted, #9aa0ad); cursor: pointer; font-size: 0.82rem; }
  .rooms button.active { background: var(--accent, #6366f1); border-color: transparent; color: #fff; }
  .chatbox { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 12px; height: 52vh; min-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
  .msg { max-width: 78%; align-self: flex-start; background: #12151d; border: 1px solid #2a2f3a; border-radius: 10px; padding: 7px 11px; }
  .msg.mine { align-self: flex-end; background: #1c2130; border-color: #34406b; }
  .mhead { display: flex; align-items: center; gap: 6px; font-size: 0.76rem; color: var(--muted); }
  .mhead b { color: var(--accent, #6366f1); }
  .mcountry { color: var(--muted); }
  .mtime { margin-left: 4px; }
  .mbody { margin-top: 2px; font-size: 0.92rem; white-space: pre-wrap; word-break: break-word; }
  .hint { color: var(--muted, #9aa0ad); margin: auto; }
  .composer { display: flex; gap: 8px; margin-top: 10px; }
  .composer input { flex: 1; padding: 10px 12px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: inherit; font: inherit; }
  .send { padding: 10px 18px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
</style>
