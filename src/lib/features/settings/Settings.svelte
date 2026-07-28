<script lang="ts">
  import { onMount } from 'svelte';
  import { getApiKey, saveApiKey, loadApiKeyIntoAdapter } from '$lib/services/settings.service';
  import { i18n } from '$lib/i18n.svelte';
  const t = i18n.t;

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
    try { await saveApiKey(key); msg = t('settings.saved'); }
    catch (e) { const m = (e as Error).message; err = m === 'Nicht eingeloggt' ? t('settings.pleaseLogin') : m; }
    finally { busy = false; }
  }
</script>

<div class="settings">
  <div class="card">
    <h3>{t('settings.langTitle')}</h3>
    <p class="muted">{t('settings.langHint')}</p>
    <div class="langrow">
      <button class="lang" class:on={i18n.locale === 'de'} onclick={() => i18n.setLocale('de')}>🇩🇪 {t('settings.german')}</button>
      <button class="lang" class:on={i18n.locale === 'en'} onclick={() => i18n.setLocale('en')}>🇬🇧 {t('settings.english')}</button>
    </div>
  </div>

  <div class="card">
    <h3>{t('settings.apiTitle')}</h3>
    <p class="muted">{t('settings.apiP1')}</p>
    <p class="muted">{t('settings.apiP2')}</p>
    <ul class="hints">
      <li><a href="https://www.pokemonpricetracker.com/api" target="_blank" rel="noopener">{t('settings.apiLi1')}</a></li>
      <li>{t('settings.apiLi2')}</li>
    </ul>

    {#if loading}
      <div class="muted">{t('settings.loading')}</div>
    {:else}
      <div class="keyrow">
        <input type="password" placeholder={t('settings.keyPlaceholder')} bind:value={key} autocomplete="off" />
        <button onclick={save} disabled={busy}>{busy ? t('settings.saving') : t('settings.save')}</button>
      </div>
      {#if msg}<span class="ok">{msg}</span>{/if}
      {#if err}<span class="err">{err}</span>{/if}
    {/if}
  </div>
</div>

<style>
  .settings { max-width: 640px; display: flex; flex-direction: column; gap: 16px; }
  .langrow { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
  .lang { padding: 9px 16px; border-radius: 999px; border: 1px solid var(--border, #272e3b); background: var(--surface-2, #1b202b); color: var(--muted, #95a1b4); font-weight: 600; cursor: pointer; }
  .lang.on { background: var(--accent, #6e7cff); color: var(--on-accent, #fff); border-color: transparent; }
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
