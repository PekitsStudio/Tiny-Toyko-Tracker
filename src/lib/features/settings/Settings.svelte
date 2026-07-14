<script lang="ts">
  import { onMount } from 'svelte';
  import { getApiKey, saveApiKey, loadApiKeyIntoAdapter } from '$lib/services/settings.service';

  let key = $state('');
  let busy = $state(false);
  let loading = $state(true);
  let msg = $state('');
  let err = $state('');

  onMount(async () => {
    try { key = await getApiKey(); await loadApiKeyIntoAdapter(); }
    catch (e) { err = (e as Error).message; }
    finally { loading = false; }
  });

  async function save() {
    busy = true; msg = ''; err = '';
    try { await saveApiKey(key); msg = 'Gespeichert ✓'; }
    catch (e) { const m = (e as Error).message; err = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { busy = false; }
  }
</script>

<div class="settings">
  <div class="card">
    <h3>Preis-API · PokemonPriceTracker (optional)</h3>
    <p class="muted"><b>Japanische</b> Kartenpreise laufen bereits automatisch über den Server – dafür musst du hier <b>nichts</b> eintragen.</p>
    <p class="muted">Ein eigener API-Key ist <b>optional</b> und nur nötig, wenn du <b>gegradete Karten</b> (PSA/CGC/BGS …) suchen möchtest. Diese Abfragen laufen dann über deinen persönlichen Key.</p>
    <ul class="hints">
      <li>Kostenlosen Key holen auf <a href="https://www.pokemonpricetracker.com/api" target="_blank" rel="noopener">pokemonpricetracker.com/api</a> (100 Abfragen/Tag, keine Kreditkarte).</li>
      <li>Der Key wird nur für dein Konto gespeichert und für die Graded-Suche verwendet.</li>
    </ul>

    {#if loading}
      <div class="muted">Lädt…</div>
    {:else}
      <div class="keyrow">
        <input type="password" placeholder="API-Key einfügen" bind:value={key} autocomplete="off" />
        <button onclick={save} disabled={busy}>{busy ? '…' : 'Speichern'}</button>
      </div>
      {#if msg}<span class="ok">{msg}</span>{/if}
      {#if err}<span class="err">{err}</span>{/if}
    {/if}
  </div>
</div>

<style>
  .settings { max-width: 640px; }
  .card { background: var(--surface, #14181f); border: 1px solid var(--border, #272e3b); border-radius: var(--r, 14px); padding: 20px 22px; }
  .card h3 { margin: 0 0 8px; font-size: 1.05rem; }
  .muted { color: var(--muted, #95a1b4); }
  .hints { color: var(--muted, #95a1b4); font-size: 0.88rem; margin: 10px 0 16px; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
  .hints a { color: var(--accent, #6e7cff); }
  .keyrow { display: flex; gap: 8px; flex-wrap: wrap; }
  .keyrow input { flex: 1 1 240px; padding: 10px 12px; border-radius: var(--r-sm, 8px); border: 1px solid var(--border, #2a2f3a); background: var(--surface-2, #12151d); color: inherit; font: inherit; }
  .keyrow button { padding: 10px 18px; border-radius: var(--r-sm, 8px); border: 0; background: var(--accent, #6e7cff); color: var(--on-accent, #fff); font-weight: 600; cursor: pointer; }
  .ok { color: var(--pos, #86efac); font-size: 0.85rem; display: inline-block; margin-top: 8px; }
  .err { color: var(--neg, #fca5a5); font-size: 0.85rem; display: inline-block; margin-top: 8px; }
</style>
