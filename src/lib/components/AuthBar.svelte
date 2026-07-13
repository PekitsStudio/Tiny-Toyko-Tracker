<script lang="ts">
  import { auth } from '$lib/stores/auth.svelte';
  import { TURNSTILE_SITE_KEY } from '$lib/config';
  import Turnstile from './Turnstile.svelte';

  type Mode = 'login' | 'register' | 'reset';
  let mode = $state<Mode>('login');
  let email = $state('');
  let password = $state('');
  let username = $state('');
  let newPassword = $state('');
  let token = $state('');
  let err = $state('');
  let msg = $state('');
  let busy = $state(false);
  let tsKey = $state(0);

  let nameState = $state<'' | 'checking' | 'free' | 'taken'>('');
  let nameTimer: ReturnType<typeof setTimeout> | undefined;

  function resetTs() { token = ''; tsKey++; }
  function switchMode(m: Mode) { mode = m; err = ''; msg = ''; resetTs(); }

  function onUsername() {
    clearTimeout(nameTimer);
    const u = username.trim();
    if (u.length < 3) { nameState = ''; return; }
    nameState = 'checking';
    nameTimer = setTimeout(async () => {
      try { nameState = (await auth.nameAvailable(u)) ? 'free' : 'taken'; }
      catch { nameState = ''; }
    }, 400);
  }

  async function login() {
    err = ''; busy = true;
    try { await auth.signIn(email, password, token || undefined); password = ''; }
    catch (e) { err = (e as Error).message; resetTs(); } finally { busy = false; }
  }
  async function register() {
    err = ''; msg = '';
    if (username.trim().length < 3) { err = 'Name zu kurz (min. 3 Zeichen).'; return; }
    if (nameState === 'taken') { err = 'Name ist bereits vergeben.'; return; }
    if (password.length < 6) { err = 'Passwort zu kurz (min. 6 Zeichen).'; return; }
    busy = true;
    try {
      await auth.signUp(email, password, username.trim(), token || undefined);
      msg = 'Fast fertig! Bitte bestätige deine E-Mail über den Link, den wir dir geschickt haben.';
      password = '';
    } catch (e) { err = (e as Error).message; resetTs(); } finally { busy = false; }
  }
  async function reset() {
    err = ''; msg = ''; busy = true;
    try { await auth.resetPassword(email, token || undefined); msg = 'Wenn die E-Mail existiert, haben wir dir einen Link zum Zurücksetzen geschickt.'; }
    catch (e) { err = (e as Error).message; resetTs(); } finally { busy = false; }
  }
  async function setNewPassword() {
    err = ''; if (newPassword.length < 6) { err = 'Passwort zu kurz (min. 6 Zeichen).'; return; }
    busy = true;
    try { await auth.updatePassword(newPassword); msg = 'Passwort geändert. Du bist angemeldet.'; newPassword = ''; }
    catch (e) { err = (e as Error).message; } finally { busy = false; }
  }
</script>

<div class="authbar">
  {#if auth.recovery}
    <form onsubmit={(e) => { e.preventDefault(); setNewPassword(); }}>
      <span class="lbl">Neues Passwort setzen:</span>
      <input type="password" placeholder="Neues Passwort" bind:value={newPassword} autocomplete="new-password" />
      <button disabled={busy}>{busy ? '…' : 'Speichern'}</button>
      {#if msg}<span class="ok">{msg}</span>{/if}
      {#if err}<span class="err">{err}</span>{/if}
    </form>
  {:else if auth.user}
    <span class="who">Angemeldet: <b>{auth.user.email}</b></span>
    <button class="ghost" onclick={() => auth.signOut()}>Abmelden</button>
  {:else}
    <div class="modes">
      <button class:active={mode === 'login'} onclick={() => switchMode('login')}>Anmelden</button>
      <button class:active={mode === 'register'} onclick={() => switchMode('register')}>Registrieren</button>
      <button class:active={mode === 'reset'} onclick={() => switchMode('reset')}>Passwort vergessen</button>
    </div>

    {#if mode === 'login'}
      <form onsubmit={(e) => { e.preventDefault(); login(); }}>
        <input type="email" placeholder="E-Mail" bind:value={email} autocomplete="username" />
        <input type="password" placeholder="Passwort" bind:value={password} autocomplete="current-password" />
        {#if TURNSTILE_SITE_KEY}{#key tsKey}<Turnstile ontoken={(t) => (token = t)} />{/key}{/if}
        <button disabled={busy}>{busy ? '…' : 'Anmelden'}</button>
      </form>
    {:else if mode === 'register'}
      <form onsubmit={(e) => { e.preventDefault(); register(); }}>
        <input type="email" placeholder="E-Mail" bind:value={email} autocomplete="email" />
        <span class="namewrap">
          <input type="text" placeholder="Anzeigename (fest)" bind:value={username} oninput={onUsername} autocomplete="username" />
          {#if nameState === 'checking'}<span class="ns">…</span>{:else if nameState === 'free'}<span class="ns ok">frei ✓</span>{:else if nameState === 'taken'}<span class="ns err">vergeben</span>{/if}
        </span>
        <input type="password" placeholder="Passwort (min. 6)" bind:value={password} autocomplete="new-password" />
        {#if TURNSTILE_SITE_KEY}{#key tsKey}<Turnstile ontoken={(t) => (token = t)} />{/key}{/if}
        <button disabled={busy}>{busy ? '…' : 'Registrieren'}</button>
      </form>
    {:else}
      <form onsubmit={(e) => { e.preventDefault(); reset(); }}>
        <input type="email" placeholder="E-Mail" bind:value={email} autocomplete="email" />
        {#if TURNSTILE_SITE_KEY}{#key tsKey}<Turnstile ontoken={(t) => (token = t)} />{/key}{/if}
        <button disabled={busy}>{busy ? '…' : 'Link senden'}</button>
      </form>
    {/if}
    {#if msg}<span class="ok">{msg}</span>{/if}
    {#if err}<span class="err">{err}</span>{/if}
  {/if}
</div>

<style>
  .authbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 16px; border-bottom: 1px solid var(--border, #232833); background: color-mix(in srgb, var(--surface, #14181f) 60%, transparent); }
  .modes { display: flex; gap: 4px; }
  .modes button { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border, #2a2f3a); background: transparent; color: var(--muted, #9aa0ad); cursor: pointer; font-size: 0.8rem; transition: var(--trans, 0.16s ease); }
  .modes button:hover { color: var(--text, #eaedf3); border-color: var(--border-strong, #38414f); }
  .modes button.active { background: var(--accent, #6e7cff); border-color: transparent; color: var(--on-accent, #fff); }
  form { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  input { padding: 9px 12px; border-radius: var(--r-sm, 8px); border: 1px solid var(--border, #2a2f3a); background: var(--surface-2, #12151d); color: inherit; }
  input:focus { border-color: var(--accent, #6e7cff); outline: none; }
  .namewrap { position: relative; display: inline-flex; align-items: center; gap: 6px; }
  .ns { font-size: 0.78rem; color: var(--muted); }
  form button, .authbar > button { padding: 9px 16px; border-radius: var(--r-sm, 8px); border: 0; background: var(--accent, #6e7cff); color: var(--on-accent, #fff); cursor: pointer; font-weight: 600; }
  .authbar > .ghost { background: transparent; border: 1px solid var(--border, #2a2f3a); color: inherit; font-weight: 500; }
  .lbl, .who { color: var(--muted, #9aa0ad); }
  .who { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .err { color: var(--neg, #ef4444); font-size: 13px; }
  .ok { color: var(--pos, #86efac); font-size: 13px; }

  @media (max-width: 640px) {
    .authbar { padding: 10px 12px; gap: 8px; }
    .modes { width: 100%; }
    .modes button { flex: 1 1 0; text-align: center; }
    form { width: 100%; }
    form input, .namewrap { flex: 1 1 100%; width: 100%; }
    form button { flex: 1 1 100%; }
  }
</style>
