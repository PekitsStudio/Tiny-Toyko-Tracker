<script lang="ts">
  import { detail } from '$lib/stores/detail.svelte';
  import { fmt, GAME_LABEL } from '$lib/format';
  import { updateCard } from '$lib/services/collection.service';
  import Flag from './Flag.svelte';

  const c = $derived(detail.card);
  const CONDITIONS = ['MT', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO'];
  const LANGS = ['DE', 'EN', 'FR', 'IT', 'ES', 'PT', 'NL', 'PL', 'RU', 'JA', 'KO'];

  let ed = $state({ condition: 'NM', language: 'DE', quantity: 1, notes: '' });
  let saving = $state(false);
  let savedMsg = $state('');

  $effect(() => {
    const cc = detail.card;
    if (cc?.cardId) {
      ed = {
        condition: cc.condition ?? 'NM',
        language: (cc.lang ?? 'DE').toUpperCase(),
        quantity: cc.quantity ?? 1,
        notes: cc.notes ?? ''
      };
      savedMsg = '';
    }
  });

  function close() { detail.close(); }
  function onkey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }

  async function save() {
    if (!c?.cardId) return;
    saving = true;
    try {
      await updateCard(c.cardId, {
        condition: ed.condition,
        language: ed.language,
        quantity: Math.max(1, Math.floor(ed.quantity)),
        notes: ed.notes ? ed.notes : null
      });
      detail.markSaved();
      savedMsg = 'Gespeichert ✓';
    } catch (e) {
      savedMsg = (e as Error).message;
    } finally {
      saving = false;
    }
  }

  // aktuelle Sprache in die Optionen aufnehmen, falls nicht in der Standardliste
  const langOptions = $derived(
    ed.language && !LANGS.includes(ed.language) ? [ed.language, ...LANGS] : LANGS
  );
</script>

<svelte:window onkeydown={onkey} />

{#if c}
  <div class="ov" onclick={close} role="presentation">
    <div class="dlg" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
      <button class="x" onclick={close} aria-label="Schließen">✕</button>
      <div class="body">
        {#if c.imageUrl}<img class="big" src={c.imageUrl} alt={c.name} />{:else}<div class="big ph">kein Bild</div>{/if}
        <div class="info">
          <span class="tag {c.game}">{GAME_LABEL[c.game] ?? c.game}</span>
          <h2>{c.name}</h2>
          <div class="line"><Flag lang={c.lang} />{c.setName ?? ''}{#if c.number} · {c.number}{/if}</div>
          {#if c.rarity}<div class="muted">{c.rarity}</div>{/if}
          <div class="prices">
            {#if c.price != null}<div class="big-price">{fmt(c.price, c.currency ?? 'EUR')}</div>{/if}
            {#if c.priceLow != null}<div class="muted">Ab {fmt(c.priceLow, c.currency ?? 'EUR')}</div>{/if}
            {#if c.priceTrend != null}<div class="muted">Trend {fmt(c.priceTrend, c.currency ?? 'EUR')}</div>{/if}
          </div>
          {#if c.cardmarketUrl}<a href={c.cardmarketUrl} target="_blank" rel="noopener" class="cm">Auf Cardmarket ansehen ↗</a>{/if}

          {#if c.cardId}
            <div class="edit">
              <h3>Bearbeiten</h3>
              <div class="row2">
                <label>Zustand<select bind:value={ed.condition}>{#each CONDITIONS as x}<option>{x}</option>{/each}</select></label>
                <label>Sprache<select bind:value={ed.language}>{#each langOptions as x}<option>{x}</option>{/each}</select></label>
              </div>
              <div class="row2">
                <label>Menge<input type="number" min="1" bind:value={ed.quantity} /></label>
              </div>
              <label>Notiz<textarea rows="2" bind:value={ed.notes}></textarea></label>
              <div class="saverow">
                <button class="save" onclick={save} disabled={saving}>{saving ? '…' : 'Speichern'}</button>
                {#if savedMsg}<span class="saved">{savedMsg}</span>{/if}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .ov { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
  .dlg { position: relative; background: var(--surface, #171a23); border: 1px solid #2a2f3a; border-radius: 16px; max-width: 640px; width: 100%; max-height: 90vh; overflow: auto; }
  .x { position: absolute; top: 10px; right: 10px; width: 34px; height: 34px; border-radius: 999px; border: 1px solid #2a2f3a; background: rgba(0,0,0,0.3); color: inherit; cursor: pointer; }
  .body { display: flex; gap: 20px; padding: 22px; flex-wrap: wrap; }
  .big { width: 220px; max-width: 45vw; aspect-ratio: 5/7; object-fit: contain; background: #0a0c10; border-radius: 10px; }
  .info { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 8px; }
  .info h2 { margin: 4px 0; font-size: 1.35rem; }
  .line { display: flex; align-items: center; color: var(--muted); }
  .muted { color: var(--muted, #9aa0ad); font-size: 0.9rem; }
  .big-price { color: var(--gold, #f5c451); font-weight: 800; font-size: 1.5rem; }
  .cm { color: var(--accent, #6366f1); text-decoration: none; }
  .edit { margin-top: 12px; border-top: 1px solid #2a2f3a; padding-top: 12px; display: flex; flex-direction: column; gap: 8px; }
  .edit h3 { margin: 0 0 2px; font-size: 1rem; }
  .edit label { display: flex; flex-direction: column; gap: 3px; font-size: 0.82rem; color: var(--muted); flex: 1; }
  .row2 { display: flex; gap: 10px; }
  .edit select, .edit input, .edit textarea { padding: 7px 9px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .saverow { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
  .save { padding: 8px 16px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
  .saved { color: #86efac; font-size: 0.85rem; }
</style>
