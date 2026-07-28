<script lang="ts">
  import { onMount } from 'svelte';
  import { listAlerts, deleteAlert, checkAlerts, type PriceAlert } from '$lib/services/alerts.service';
  import { fmt, GAME_LABEL } from '$lib/format';
  import { i18n } from '$lib/i18n.svelte';

  let alerts = $state<PriceAlert[]>([]);
  let status = $state(''); let loading = $state(false); let busy = $state<number | null>(null);
  let checking = $state(false); let checkMsg = $state('');

  async function load() {
    loading = true; status = '';
    try { alerts = await listAlerts(); if (!alerts.length) status = i18n.t('alerts.empty'); }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? i18n.t('common.pleaseLoginShort') : m; }
    finally { loading = false; }
  }
  onMount(load);

  async function check() {
    checking = true; checkMsg = i18n.t('alerts.checking');
    try { const r = await checkAlerts((d, t) => (checkMsg = i18n.t('alerts.checkProgress', { d, t }))); await load(); checkMsg = i18n.t('alerts.checkResult', { tr: r.triggered, c: r.checked }); setTimeout(() => (checkMsg = ''), 4000); }
    catch (e) { checkMsg = (e as Error).message; } finally { checking = false; }
  }
  async function del(a: PriceAlert) {
    busy = a.id;
    try { await deleteAlert(a.id); alerts = alerts.filter((x) => x.id !== a.id); } catch (e) { status = (e as Error).message; } finally { busy = null; }
  }
</script>

<div class="head">
  <div><h2>{i18n.t('alerts.title')}</h2><div class="muted">{i18n.t('alerts.count', { n: alerts.length })}{#if checkMsg}{' · '}{checkMsg}{/if}</div></div>
  <button class="primary" onclick={check} disabled={checking || loading || !alerts.length}>{checking ? '…' : i18n.t('alerts.check')}</button>
</div>

{#if status}<div class="hint">{status}</div>{/if}

<div class="list">
  {#each alerts as a (a.id)}
    <div class="row" class:busy={busy === a.id} class:hit={a.triggered}>
      {#if a.image_url}<img src={a.image_url} alt="" loading="lazy" />{:else}<div class="ph">?</div>{/if}
      <div class="info">
        <div class="n">{a.name} <span class="g">{GAME_LABEL[a.game] ?? a.game}</span></div>
        <div class="cond">{a.direction === 'below' ? '≤' : '≥'} {fmt(a.target_price, a.currency ?? 'EUR')}
          {#if a.last_price != null}{' · '}{i18n.t('alerts.last', { p: fmt(a.last_price, a.currency ?? 'EUR') })}{/if}
          {#if a.triggered}<span class="badge">{i18n.t('alerts.triggered')}</span>{/if}
        </div>
      </div>
      <button class="del" onclick={() => del(a)} disabled={busy === a.id} title={i18n.t('alerts.delete')}>✕</button>
    </div>
  {/each}
</div>

<style>
  .head { display: flex; align-items: center; justify-content: space-between; margin: 4px 0 14px; gap: 12px; flex-wrap: wrap; }
  .head h2 { margin: 0; } .muted { color: var(--muted, #9aa0ad); font-size: 14px; }
  .primary { padding: 8px 14px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
  .primary:disabled { opacity: 0.6; cursor: default; }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: center; gap: 12px; background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 10px; padding: 10px 12px; }
  .row.busy { opacity: 0.55; pointer-events: none; }
  .row.hit { border-color: #f5c451; }
  .row img { width: 38px; height: 53px; object-fit: contain; border-radius: 4px; background: #0a0c10; }
  .ph { width: 38px; height: 53px; display: flex; align-items: center; justify-content: center; color: var(--muted); background: #0a0c10; border-radius: 4px; }
  .info { flex: 1; }
  .n { font-weight: 600; } .g { color: var(--muted); font-size: 0.78rem; margin-left: 6px; }
  .cond { color: var(--muted); font-size: 0.85rem; margin-top: 2px; }
  .badge { color: #f5c451; margin-left: 8px; font-weight: 600; }
  .del { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #3a1620; background: transparent; color: #fca5a5; cursor: pointer; }
  .hint { color: var(--muted, #9aa0ad); margin: 8px 0; }
</style>
