<script lang="ts">
  import { onMount } from 'svelte';
  import { getMyProfile, updateMyProfile } from '$lib/services/profile.service';
  import { getLevel } from '$lib/services/gamification.service';
  import { auth } from '$lib/stores/auth.svelte';

  let displayName = $state('');
  let avatar = $state(''); // wird im Avatar-Shop gesetzt; hier nur angezeigt
  let f = $state({ country: '', contact: '', bio: '', fav_games: '', collector_type: '' });
  let lvl = $state<{ level: number; into: number; need: number } | null>(null);
  let loading = $state(false); let saving = $state(false); let msg = $state('');

  const initial = $derived((displayName || auth.user?.email || 'S').slice(0, 1).toUpperCase());
  const pct = $derived(lvl ? Math.min(100, Math.round((lvl.into / lvl.need) * 100)) : 0);

  async function load() {
    loading = true; msg = '';
    try {
      const p = await getMyProfile();
      displayName = p.display_name ?? '';
      avatar = p.avatar_url ?? '';
      f = {
        country: p.country ?? '', contact: p.contact ?? '', bio: p.bio ?? '',
        fav_games: p.fav_games ?? '', collector_type: p.collector_type ?? ''
      };
      try { lvl = await getLevel(); } catch { lvl = null; }
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

<div class="card">
  <div class="banner"></div>
  <div class="idrow">
    {#if avatar}
      <img class="av" src={avatar} alt="Profilbild" />
    {:else}
      <div class="av avph">{initial}</div>
    {/if}
    <div class="who">
      <h2>{displayName || auth.user?.email || 'Sammler'}</h2>
      {#if lvl}<div class="lvline">Level {lvl.level}{#if f.collector_type} · {f.collector_type}{/if}</div>{/if}
    </div>
  </div>
  {#if lvl}
    <div class="xp">
      <div class="xptop"><span>Level {lvl.level}</span><span>{lvl.into} / {lvl.need} XP</span></div>
      <div class="bar"><div class="fill" style="width:{pct}%"></div></div>
    </div>
  {/if}
</div>

{#if loading}<div class="hint">Lädt…</div>{/if}

<div class="form">
  <div class="avatarnote">
    <span>🎨 Dein Avatar wählst du im Reiter <strong>Avatar-Shop</strong> aus.</span>
    <small>Ohne ausgewählten Avatar zeigt dein Profil den Anfangsbuchstaben deines Namens.</small>
  </div>
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
  .card { border: 1px solid var(--border, #272e3b); border-radius: 16px; overflow: hidden; background: var(--surface, #14181f); margin-bottom: 20px; }
  .banner { height: 108px; background: linear-gradient(110deg, var(--gold, #f2b85a) 0%, var(--accent, #6e7cff) 55%, var(--accent-2, #8a7bff) 100%); }
  .idrow { display: flex; align-items: flex-end; gap: 14px; padding: 0 20px; margin-top: -38px; }
  .av { width: 84px; height: 84px; border-radius: 20px; object-fit: cover; background: var(--surface-2, #1b202b); border: 4px solid var(--surface, #14181f); flex-shrink: 0; }
  .avph { display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 2.1rem; color: var(--accent, #6e7cff); font-family: 'Space Grotesk', system-ui, sans-serif; }
  .who { padding-bottom: 6px; min-width: 0; }
  .who h2 { margin: 0; font-size: 1.35rem; overflow: hidden; text-overflow: ellipsis; }
  .lvline { color: var(--muted, #95a1b4); font-size: 0.86rem; margin-top: 2px; }
  .xp { padding: 12px 20px 18px; }
  .xptop { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--muted, #95a1b4); margin-bottom: 6px; }
  .bar { height: 8px; border-radius: 999px; background: var(--surface-2, #1b202b); overflow: hidden; }
  .fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--accent, #6e7cff), var(--accent-2, #8a7bff)); transition: width 0.4s ease; }

  .hint { color: var(--muted, #95a1b4); }
  .form { max-width: 560px; display: flex; flex-direction: column; gap: 12px; }
  .avatarnote { background: color-mix(in srgb, var(--accent, #6e7cff) 10%, var(--surface, #14181f)); border: 1px solid color-mix(in srgb, var(--accent, #6e7cff) 30%, transparent); border-radius: 10px; padding: 10px 13px; display: flex; flex-direction: column; gap: 3px; font-size: 0.85rem; }
  .avatarnote small { color: var(--muted, #95a1b4); font-size: 0.76rem; }
  .form label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; color: var(--muted, #9aa0ad); }
  .form input, .form textarea { padding: 9px 11px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .form input:disabled { opacity: 0.7; }
  .form small { color: var(--muted); font-size: 0.75rem; }
  .hint-inline { color: var(--muted); font-weight: 400; }
  .saverow { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
  .save { padding: 9px 18px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
  .msg { color: #86efac; font-size: 0.85rem; }
</style>
