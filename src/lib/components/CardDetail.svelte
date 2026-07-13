<script lang="ts">
  import { detail } from '$lib/stores/detail.svelte';
  import { fmt, GAME_LABEL } from '$lib/format';
  import { updateCard, sellCard } from '$lib/services/collection.service';
  import { setForSale, setSeeking } from '$lib/services/market.service';
  import { addAlert, type Direction } from '$lib/services/alerts.service';
  import { listCardComments, addCardComment, deleteCardComment, type CardComment } from '$lib/services/cardcomments.service';
  import { auth } from '$lib/stores/auth.svelte';
  import Flag from './Flag.svelte';

  const c = $derived(detail.card);
  const CONDITIONS = ['MT', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO'];
  const LANGS = ['DE', 'EN', 'FR', 'IT', 'ES', 'PT', 'NL', 'PL', 'RU', 'JA', 'KO'];

  let ed = $state<{ condition: string; language: string; quantity: number; notes: string; purchasePrice: number | null; purchaseDate: string }>(
    { condition: 'NM', language: 'DE', quantity: 1, notes: '', purchasePrice: null, purchaseDate: '' }
  );
  let sale = $state<{ forSale: boolean; askingPrice: number | null }>({ forSale: false, askingPrice: null });
  let seek = $state<{ seeking: boolean; maxPrice: number | null }>({ seeking: false, maxPrice: null });
  let soldPrice = $state<number | null>(null);
  let saving = $state(false);
  let savedMsg = $state('');
  let alertT = $state<number | null>(null);
  let alertDir = $state<Direction>('below');
  let alertMsg = $state('');

  let comments = $state<CardComment[]>([]);
  let newComment = $state('');
  let commentBusy = $state(false);

  // Kommentare laden, sobald sich die angezeigte Karte (external_id) aendert.
  $effect(() => {
    const cc = detail.card;
    comments = []; newComment = '';
    if (cc?.externalId) {
      const game = cc.game, ext = cc.externalId;
      (async () => { try { comments = await listCardComments(game, ext); } catch { comments = []; } })();
    }
  });

  async function sendComment() {
    if (!c?.externalId || !newComment.trim()) return;
    commentBusy = true;
    try { await addCardComment(c.game, c.externalId, newComment.trim()); newComment = ''; comments = await listCardComments(c.game, c.externalId); }
    catch (e) { alertMsg = (e as Error).message; } finally { commentBusy = false; }
  }
  async function removeComment(id: number) {
    if (!c?.externalId) return;
    try { await deleteCardComment(id); comments = comments.filter((x) => x.id !== id); }
    catch (e) { alertMsg = (e as Error).message; }
  }
  function cdt(iso: string) { try { return new Date(iso).toLocaleDateString('de-DE'); } catch { return ''; } }

  $effect(() => {
    const cc = detail.card;
    savedMsg = '';
    if (cc?.cardId) {
      ed = {
        condition: cc.condition ?? 'NM', language: (cc.lang ?? 'DE').toUpperCase(), quantity: cc.quantity ?? 1,
        notes: cc.notes ?? '', purchasePrice: cc.purchasePrice ?? null, purchaseDate: cc.purchaseDate ?? ''
      };
      sale = { forSale: !!cc.forSale, askingPrice: cc.askingPrice ?? null };
      soldPrice = cc.askingPrice ?? cc.price ?? null;
    }
    if (cc?.wishlistId) {
      seek = { seeking: !!cc.seeking, maxPrice: cc.seekMaxPrice ?? null };
    }
  });

  async function saveAlert() {
    if (!c?.externalId || alertT == null) return;
    try { await addAlert({ game: c.game, externalId: c.externalId, name: c.name, setName: c.setName, imageUrl: c.imageUrl, language: c.lang, currency: c.currency, targetPrice: alertT, direction: alertDir }); alertMsg = 'Preisalarm gesetzt ✓'; alertT = null; }
    catch (e) { alertMsg = (e as Error).message; }
  }
  function close() { detail.close(); }
  function onkey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }

  async function saveCard() {
    if (!c?.cardId) return;
    saving = true;
    try {
      await updateCard(c.cardId, {
        condition: ed.condition, language: ed.language, quantity: Math.max(1, Math.floor(ed.quantity)),
        notes: ed.notes ? ed.notes : null,
        purchase_price: ed.purchasePrice, purchase_date: ed.purchaseDate ? ed.purchaseDate : null
      });
      await setForSale(c.cardId, sale.forSale, sale.forSale ? (sale.askingPrice ?? null) : null);
      detail.markSaved();
      savedMsg = 'Gespeichert ✓';
    } catch (e) { savedMsg = (e as Error).message; } finally { saving = false; }
  }

  async function sellNow() {
    if (!c?.cardId) return;
    if (!confirm(`„${c.name}" als verkauft markieren? Sie wandert in den Reiter „Verkauft".`)) return;
    saving = true;
    try {
      await sellCard(c.cardId, soldPrice ?? null);
      detail.markSaved();
      close();
    } catch (e) { savedMsg = (e as Error).message; } finally { saving = false; }
  }

  async function saveSeek() {
    if (!c?.wishlistId) return;
    saving = true;
    try {
      await setSeeking(c.wishlistId, seek.seeking, seek.seeking ? (seek.maxPrice ?? null) : null);
      detail.markSaved();
      savedMsg = 'Gespeichert ✓';
    } catch (e) { savedMsg = (e as Error).message; } finally { saving = false; }
  }

  const langOptions = $derived(ed.language && !LANGS.includes(ed.language) ? [ed.language, ...LANGS] : LANGS);
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
          {#if c.externalId}
            <div class="alert">
              <h3>Preisalarm</h3>
              <div class="arow">
                <select bind:value={alertDir}><option value="below">fällt auf/unter</option><option value="above">steigt auf/über</option></select>
                <input type="number" min="0" step="0.01" placeholder="Preis" bind:value={alertT} />
                <button class="save" onclick={saveAlert} disabled={alertT == null}>Setzen</button>
              </div>
              {#if alertMsg}<span class="saved">{alertMsg}</span>{/if}
            </div>
          {/if}

          {#if c.cardId}
            <div class="edit">
              <h3>Bearbeiten</h3>
              <div class="row2">
                <label>Zustand<select bind:value={ed.condition}>{#each CONDITIONS as x}<option>{x}</option>{/each}</select></label>
                <label>Sprache<select bind:value={ed.language}>{#each langOptions as x}<option>{x}</option>{/each}</select></label>
              </div>
              <div class="row2">
                <label>Menge<input type="number" min="1" bind:value={ed.quantity} /></label>
                <label>Kaufpreis<input type="number" min="0" step="0.01" bind:value={ed.purchasePrice} /></label>
                <label>Kaufdatum<input type="date" bind:value={ed.purchaseDate} /></label>
              </div>
              <label>Notiz<textarea rows="2" bind:value={ed.notes}></textarea></label>
              <div class="sale">
                <label class="chk"><input type="checkbox" bind:checked={sale.forSale} /> Zum Verkauf anbieten</label>
                {#if sale.forSale}<label>Preis<input type="number" min="0" step="0.01" bind:value={sale.askingPrice} /></label>{/if}
              </div>
              <div class="saverow">
                <button class="save" onclick={saveCard} disabled={saving}>{saving ? '…' : 'Speichern'}</button>
                {#if savedMsg}<span class="saved">{savedMsg}</span>{/if}
              </div>
              <div class="sell">
                <label>Verkaufspreis<input type="number" min="0" step="0.01" bind:value={soldPrice} /></label>
                <button class="sellbtn" onclick={sellNow} disabled={saving}>Als verkauft markieren</button>
              </div>
            </div>
          {:else if c.wishlistId}
            <div class="edit">
              <h3>Öffentlich suchen</h3>
              <label class="chk"><input type="checkbox" bind:checked={seek.seeking} /> Diese Karte im Marktplatz suchen</label>
              {#if seek.seeking}<label>Höchstpreis<input type="number" min="0" step="0.01" bind:value={seek.maxPrice} /></label>{/if}
              <div class="saverow">
                <button class="save" onclick={saveSeek} disabled={saving}>{saving ? '…' : 'Speichern'}</button>
                {#if savedMsg}<span class="saved">{savedMsg}</span>{/if}
              </div>
            </div>
          {/if}

          {#if c.externalId}
            <div class="comments">
              <h3>Kommentare</h3>
              {#each comments as cm (cm.id)}
                <div class="cm">
                  <div class="cmtop"><b>{cm.author_name ?? 'Sammler'}</b><span class="cmdate">{cdt(cm.created_at)}</span>{#if auth.user?.id === cm.user_id}<button class="cmdel" onclick={() => removeComment(cm.id)} title="Löschen">✕</button>{/if}</div>
                  <div class="cmbody">{cm.body}</div>
                </div>
              {/each}
              {#if !comments.length}<div class="muted">Noch keine Kommentare. Schreib den ersten!</div>{/if}
              <div class="cadd">
                <input placeholder="Kommentar zu dieser Karte…" bind:value={newComment} onkeydown={(e) => { if (e.key === 'Enter') sendComment(); }} />
                <button class="save" onclick={sendComment} disabled={commentBusy || !newComment.trim()}>Senden</button>
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
  .row2 { display: flex; gap: 10px; flex-wrap: wrap; }
  .edit select, .edit input, .edit textarea { padding: 7px 9px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .sale { border-top: 1px dashed #2a2f3a; padding-top: 8px; margin-top: 2px; display: flex; flex-direction: column; gap: 8px; }
  .chk { flex-direction: row; align-items: center; gap: 8px; color: var(--text); }
  .chk input { width: auto; }
  .saverow { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
  .save { padding: 8px 16px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
  .saved { color: #86efac; font-size: 0.85rem; }
  .alert { margin-top: 12px; border-top: 1px solid #2a2f3a; padding-top: 12px; }
  .alert h3 { margin: 0 0 8px; font-size: 1rem; }
  .arow { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .arow select, .arow input { padding: 7px 9px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .sell { border-top: 1px dashed #2a2f3a; padding-top: 10px; margin-top: 6px; display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
  .sellbtn { padding: 8px 14px; border-radius: 8px; border: 1px solid #3a2a16; background: transparent; color: #f5c451; cursor: pointer; font-weight: 600; }
  .comments { margin-top: 12px; border-top: 1px solid #2a2f3a; padding-top: 12px; display: flex; flex-direction: column; gap: 8px; }
  .comments h3 { margin: 0 0 2px; font-size: 1rem; }
  .cm { background: #12151d; border: 1px solid #2a2f3a; border-radius: 8px; padding: 8px 10px; }
  .cmtop { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; }
  .cmtop b { color: var(--accent, #6366f1); }
  .cmdate { color: var(--muted); }
  .cmdel { margin-left: auto; background: none; border: 0; color: #fca5a5; cursor: pointer; }
  .cmbody { margin-top: 3px; font-size: 0.9rem; white-space: pre-wrap; }
  .cadd { display: flex; gap: 8px; }
  .cadd input { flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: inherit; font: inherit; }
</style>
