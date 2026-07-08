<script lang="ts">
  import { onMount } from 'svelte';
  import { getMyProfile, updateMyProfile } from '$lib/services/profile.service';
  import { auth } from '$lib/stores/auth.svelte';

  let displayName = $state('');
  let f = $state({ country: '', contact: '', bio: '', fav_games: '', collector_type: '' });
  let loading = $state(false); let saving = $state(false); let msg = $state('');

  async function load() {
    loading = true; msg = '';
    try {
      const p = await getMyProfile();
      displayName = p.display_name ?? '';
      f = {
        country: p.country ?? '', contact: p.contact ?? '', bio: p.bio ?? '',
        fav_games: p.fav_games ?? '', collector_type: p.collector_type ?? ''
      };
    } catch (e) {
      const m = (e as Error).message;
      msg = m === 'Nicht eingeloggt' ? 'Bitte zuerst oben anmelden.' : m;
    } finally { loading = false; }
  }
  onMount(load);

  async function save() {
    saving = true; msg = '';
    try {
      await updateMyProfile({
        country: f.country || null, contact: f.contact || null, bio: f.bio || null,
        fav_games: f.fav_games || null, collector_type: f.collector_type || null
      });
      msg = 'Gespeichert ✓';
      setTimeout(() => (msg = ''), 3000);
    } catch (e) { msg = (e as Error).message; }
    finally { saving = false; }
  }
</script>

<h2>Dein Profil</h2>
{#if loading}<div class="hint">Lädt…</div>{/if}

<div class="form">
  <label>Anzeigename
    <input value={displayName || auth.user?.email || ''} disabled />
    <small>Der Anzeigename ist fest und kann nicht geändert werden.</small>
  </label>
  <label>Land<input bind:value={f.country} placeholder="z. B. DE" /></label>
  <label>Kontakt <span class="hint-inline">(für Käufer/Verkäufer im Marktplatz sichtbar)</span>
    <input bind:value={f.contact} placeholder="E-Mail, Discord, …" />
  </label>
  <label>Über mich<textarea rows="3" bind:value={f.bio}></textarea></label>
  <label>Lieblingsspiele<input bind:value={f.fav_games} placeholder="z. B. Pokémon, One Piece" /></label>
  <label>Sammlertyp<input bind:value={f.collector_type} placeholder="z. B. Investor, Spieler" /></label>
  <div class="saverow">
    <button class="save" onclick={save} disabled={saving || loading}>{saving ? '…' : 'Speichern'}</button>
    {#if msg}<span class="msg">{msg}</span>{/if}
  </div>
</div>

<style>
  h2 { margin: 8px 0 12px; }
  .form { max-width: 560px; display: flex; flex-direction: column; gap: 12px; }
  .form label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; color: var(--muted, #9aa0ad); }
  .form input, .form textarea { padding: 9px 11px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .form input:disabled { opacity: 0.7; }
  .form small { color: var(--muted); font-size: 0.75rem; }
  .hint-inline { color: var(--muted); font-weight: 400; }
  .saverow { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
  .save { padding: 9px 18px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
  .msg { color: #86efac; font-size: 0.85rem; }
</style>
