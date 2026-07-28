<script lang="ts">
  import { onMount } from 'svelte';
  import { listSealed, addSealed, updateSealed, deleteSealed, sellSealed, listGraded, addGraded, updateGraded, deleteGraded, type SealedItem, type GradedCard } from '$lib/services/extras.service';
  import { fmt, GAME_LABEL } from '$lib/format';
  import ImageUpload from '$lib/components/ImageUpload.svelte';
  import CardFilter from '$lib/components/CardFilter.svelte';
  import { applyFilter, gameCounts, defaultFilter, type FilterFields } from '$lib/features/collection/filter';
  import { i18n } from '$lib/i18n.svelte';
  const t = i18n.t;

  let mode = $state<'sealed' | 'graded'>('sealed');
  let sealed = $state<SealedItem[]>([]); let graded = $state<GradedCard[]>([]);
  let status = $state(''); let loading = $state(false); let busy = $state<number | null>(null);
  let showAdd = $state(false);
  let editingId = $state<number | null>(null);
  let customType = $state('');
  let typeFilter = $state('');
  let sellPrice = $state<number | null>(null);

  const GAMES = ['pokemon', 'magic', 'yugioh', 'onepiece', 'riftbound'];
  const COMPANIES = ['PSA', 'BGS', 'CGC', 'SGC', 'Andere'];
  const SEALED_TYPES = [
    'Display / Booster Box', 'Elite Trainer Box (ETB)', 'Booster-Bundle', 'Booster Pack',
    'Blister', 'Build & Battle Box', 'Tin', 'Mini-Tin', 'Collection Box',
    'Premium Collection', 'Starter-/Theme-Deck', 'Case', 'Adventskalender'
  ];

  let sf = $state({ name: '', game: 'pokemon', product_type: 'Display / Booster Box', set_name: '', quantity: 1, purchase_price: null as number | null, current_value: null as number | null, image_url: '' });
  let gf = $state({ name: '', set_name: '', number: '', company: 'PSA', grade: '10', cert: '', value: null as number | null, purchase_price: null as number | null, image_url: '' });

  async function load() {
    loading = true; status = '';
    try { if (mode === 'sealed') sealed = await listSealed(); else graded = await listGraded(); }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? t('common.pleaseLoginShort') : m; }
    finally { loading = false; }
  }
  onMount(load);
  function switchMode(m: 'sealed' | 'graded') { mode = m; showAdd = false; status = ''; filter.q = ''; filter.game = ''; typeFilter = ''; load(); }

  const sealedTotal = $derived(sealed.reduce((s, x) => s + (x.current_value ?? 0) * (x.quantity ?? 1), 0));
  const gradedTotal = $derived(graded.reduce((s, x) => s + (x.value ?? 0), 0));

  // Gemeinsame Suche/Spiel/Sortierung wie in den anderen Sammlungs-Reitern.
  let filter = $state(defaultFilter('name'));
  const getSealed = (x: SealedItem): FilterFields => ({ game: x.game, name: x.name, set: x.set_name, rarity: x.product_type, price: x.current_value });
  const getGraded = (x: GradedCard): FilterFields => ({ game: '', name: x.name, set: x.set_name, number: x.number, rarity: x.company, price: x.value });
  const sealedGames = $derived(gameCounts(sealed, getSealed));
  const byType = $derived(typeFilter ? sealed.filter((x) => (x.product_type || '') === typeFilter) : sealed);
  const filteredSealed = $derived(applyFilter(byType, filter, getSealed));
  const shownGraded = $derived(applyFilter(graded, filter, getGraded));
  const sealedTypeCounts = $derived.by(() => {
    const m = new Map<string, number>();
    for (const x of sealed) { const t = x.product_type || '—'; m.set(t, (m.get(t) ?? 0) + 1); }
    return [...m.entries()].map(([type, n]) => ({ type, n })).sort((a, b) => a.type.localeCompare(b.type));
  });

  function resetSealedForm() { sf = { name: '', game: 'pokemon', product_type: 'Display / Booster Box', set_name: '', quantity: 1, purchase_price: null, current_value: null, image_url: '' }; customType = ''; }
  function resetGradedForm() { gf = { name: '', set_name: '', number: '', company: 'PSA', grade: '10', cert: '', value: null, purchase_price: null, image_url: '' }; }
  function toggleAdd() {
    if (showAdd) { showAdd = false; editingId = null; return; }
    editingId = null; resetSealedForm(); resetGradedForm(); showAdd = true;
  }
  function closeForm() { showAdd = false; editingId = null; }
  function onkey(e: KeyboardEvent) { if (e.key === 'Escape' && showAdd) closeForm(); }
  async function delFromModal() {
    if (editingId == null) return;
    const id = editingId;
    if (mode === 'sealed') { const x = sealed.find((s) => s.id === id); closeForm(); if (x) await delSealed(x); }
    else { const x = graded.find((g) => g.id === id); closeForm(); if (x) await delGraded(x); }
  }
  function startEditSealed(x: SealedItem) {
    editingId = x.id;
    const known = SEALED_TYPES.includes(x.product_type);
    customType = known ? '' : (x.product_type || '');
    sf = { name: x.name, game: x.game, product_type: known ? x.product_type : '__custom__', set_name: x.set_name ?? '', quantity: x.quantity ?? 1, purchase_price: x.purchase_price ?? null, current_value: x.current_value ?? null, image_url: x.image_url ?? '' };
    sellPrice = x.current_value ?? null;
    showAdd = true;
  }
  async function sellSealedNow() {
    if (editingId == null) return;
    if (!confirm(t('ex.confirmSell'))) return;
    busy = -1;
    try {
      await sellSealed(editingId, sellPrice);
      showAdd = false; editingId = null; resetSealedForm(); await load();
    } catch (e) { status = (e as Error).message; } finally { busy = null; }
  }
  function startEditGraded(x: GradedCard) {
    editingId = x.id;
    gf = { name: x.name, set_name: x.set_name ?? '', number: x.number ?? '', company: x.company, grade: x.grade, cert: x.cert ?? '', value: x.value ?? null, purchase_price: x.purchase_price ?? null, image_url: x.image_url ?? '' };
    showAdd = true;
  }
  async function submitSealed() {
    if (!sf.name.trim()) return;
    const product_type = sf.product_type === '__custom__' ? (customType.trim() || 'Sonstiges') : sf.product_type;
    busy = -1;
    try {
      const data = { ...sf, name: sf.name.trim(), product_type, image_url: sf.image_url || null };
      if (editingId != null) await updateSealed(editingId, data); else await addSealed(data);
      showAdd = false; editingId = null; resetSealedForm(); await load();
    } catch (e) { status = (e as Error).message; } finally { busy = null; }
  }
  async function submitGraded() {
    if (!gf.name.trim() || !gf.grade.trim()) return; busy = -1;
    try {
      const data = { ...gf, name: gf.name.trim(), image_url: gf.image_url || null };
      if (editingId != null) await updateGraded(editingId, data); else await addGraded(data);
      showAdd = false; editingId = null; resetGradedForm(); await load();
    } catch (e) { status = (e as Error).message; } finally { busy = null; }
  }
  async function delSealed(x: SealedItem) { if (!confirm(t('ex.confirmDelete', { name: x.name }))) return; busy = x.id; try { await deleteSealed(x.id); sealed = sealed.filter((y) => y.id !== x.id); } catch (e) { status = (e as Error).message; } finally { busy = null; } }
  async function delGraded(x: GradedCard) { if (!confirm(t('ex.confirmDelete', { name: x.name }))) return; busy = x.id; try { await deleteGraded(x.id); graded = graded.filter((y) => y.id !== x.id); } catch (e) { status = (e as Error).message; } finally { busy = null; } }
</script>

<svelte:window onkeydown={onkey} />

<div class="coll-head">
  <div class="modes">
    <button class:active={mode === 'sealed'} onclick={() => switchMode('sealed')}>{t('ex.sealed')}</button>
    <button class:active={mode === 'graded'} onclick={() => switchMode('graded')}>{t('ex.graded')}</button>
  </div>
  <div class="right">
    <span class="muted">{mode === 'sealed' ? t('ex.products', { n: sealed.length, v: fmt(sealedTotal) }) : t('ex.gradedCount', { n: graded.length, v: fmt(gradedTotal, 'USD') })}</span>
    <button class="primary" onclick={toggleAdd}>{showAdd ? t('ex.cancel') : t('ex.add')}</button>
  </div>
</div>

{#if showAdd}
  <div class="ov" onclick={closeForm} role="presentation">
    <div class="addform dlg" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
      <button class="x" onclick={closeForm} aria-label={t('prog.close')}>✕</button>
      <div class="formtitle">{editingId != null ? t('ex.editTitle') : t('ex.addNew')}</div>
    {#if mode === 'sealed'}
      <div class="grid2">
        <label>{t('ex.name')}<input bind:value={sf.name} placeholder={t('ex.namePhSealed')} /></label>
        <label>{t('ex.game')}<select bind:value={sf.game}>{#each GAMES as g (g)}<option value={g}>{GAME_LABEL[g] ?? g}</option>{/each}</select></label>
        <label>{t('ex.productType')}
          <select bind:value={sf.product_type}>
            {#each SEALED_TYPES as st (st)}<option value={st}>{st}</option>{/each}
            <option value="__custom__">{t('ex.other')}</option>
          </select>
        </label>
        {#if sf.product_type === '__custom__'}<label>{t('ex.customType')}<input bind:value={customType} placeholder={t('ex.customTypePh')} /></label>{/if}
        <label>{t('ex.set')}<input bind:value={sf.set_name} placeholder={t('ex.setPh')} /></label>
        <label>{t('ex.qty')}<input type="number" min="1" bind:value={sf.quantity} /></label>
        <label>{t('ex.buyPriceEur')}<input type="number" min="0" step="0.01" bind:value={sf.purchase_price} /></label>
        <label>{t('ex.currentValueEur')}<input type="number" min="0" step="0.01" bind:value={sf.current_value} /></label>
      </div>
      <div class="imgfield"><span class="imgfield-l">{t('ex.imageOptional')}</span><ImageUpload bind:value={sf.image_url} folder="sealed" /></div>
      <button class="primary" onclick={submitSealed} disabled={busy === -1 || !sf.name.trim()}>{editingId != null ? t('ex.update') : t('ex.save')}</button>
      {#if editingId != null}
        <div class="sellbox">
          <label class="selllabel">{t('ex.sellPriceEur')}<input type="number" min="0" step="0.01" bind:value={sellPrice} /></label>
          <button class="sellbtn" onclick={sellSealedNow} disabled={busy === -1}>{t('ex.markSold')}</button>
        </div>
      {/if}
    {:else}
      <div class="grid2">
        <label>{t('ex.name')}<input bind:value={gf.name} placeholder={t('ex.namePhGraded')} /></label>
        <label>{t('ex.set')}<input bind:value={gf.set_name} placeholder={t('ex.setPhGraded')} /></label>
        <label>{t('ex.number')}<input bind:value={gf.number} placeholder={t('ex.numberPh')} /></label>
        <label>{t('ex.company')}<select bind:value={gf.company}>{#each COMPANIES as c (c)}<option>{c}</option>{/each}</select></label>
        <label>{t('ex.grade')}<input bind:value={gf.grade} placeholder={t('ex.gradePh')} /></label>
        <label>{t('ex.cert')}<input bind:value={gf.cert} placeholder={t('ex.certPh')} /></label>
        <label>{t('ex.valueUsd')}<input type="number" min="0" step="0.01" bind:value={gf.value} /></label>
        <label>{t('ex.buyPriceUsd')}<input type="number" min="0" step="0.01" bind:value={gf.purchase_price} /></label>
      </div>
      <div class="imgfield"><span class="imgfield-l">{t('ex.imageOptional')}</span><ImageUpload bind:value={gf.image_url} folder="graded" /></div>
      <button class="primary" onclick={submitGraded} disabled={busy === -1 || !gf.name.trim()}>{editingId != null ? t('ex.update') : t('ex.save')}</button>
    {/if}
      {#if editingId != null}<button class="modaldel" onclick={delFromModal} disabled={busy === -1}>{t('ex.deleteFromStock')}</button>{/if}
    </div>
  </div>
{/if}

{#if status}<div class="hint">{status}</div>{/if}

{#if mode === 'sealed'}
  {#if !sealed.length && !loading}<div class="hint">{t('ex.emptySealed')}</div>{/if}
  {#if sealed.length}
    <CardFilter bind:state={filter} games={sealedGames} sorts={['name', 'price_desc', 'price_asc']} total={byType.length} shown={filteredSealed.length} />
    <div class="filterbar">
      <label>{t('ex.filterType')}
        <select bind:value={typeFilter}>
          <option value="">{t('ex.filterAll', { n: sealed.length })}</option>
          {#each sealedTypeCounts as tc (tc.type)}<option value={tc.type}>{tc.type} ({tc.n})</option>{/each}
        </select>
      </label>
    </div>
  {/if}
  {#if typeFilter && !filteredSealed.length}<div class="hint">{t('ex.noType')}</div>{/if}
  <div class="grid">
    {#each filteredSealed as x (x.id)}
      <div class="card" class:busy={busy === x.id}>
        <span class="tag {x.game}">{GAME_LABEL[x.game] ?? x.game}</span>
        {#if x.image_url}<img src={x.image_url} alt={x.name} loading="lazy" style="cursor:zoom-in" onclick={() => startEditSealed(x)} />{:else}<div class="boxph">📦</div>{/if}
        <div class="meta">
          <div class="name">{x.name}</div>
          <div class="set">{x.product_type}{#if x.set_name}{' · '}{x.set_name}{/if}{#if x.quantity > 1}{' · '}×{x.quantity}{/if}</div>
          <div class="price">{x.current_value != null ? fmt(x.current_value, x.currency ?? 'EUR') : t('coll.noPrice')}</div>
          {#if x.purchase_price != null}
            <div class="subline"><span class="ek">{t('ex.buyShort', { v: fmt(x.purchase_price, x.currency ?? 'EUR') })}</span>{#if x.current_value != null}<span class="pl" class:pos={(x.current_value - x.purchase_price) >= 0}>{(x.current_value - x.purchase_price) >= 0 ? '+' : ''}{fmt((x.current_value - x.purchase_price) * (x.quantity ?? 1), x.currency ?? 'EUR')}</span>{/if}</div>
          {/if}
        </div>
        <div class="card-actions">
          <button class="act" onclick={() => startEditSealed(x)} disabled={busy === x.id}>{t('ex.edit')}</button>
          <button class="act delx" onclick={() => delSealed(x)} disabled={busy === x.id} title={t('alerts.delete')}>✕</button>
        </div>
      </div>
    {/each}
  </div>
{:else}
  {#if !graded.length && !loading}<div class="hint">{t('ex.emptyGraded')}</div>{/if}
  {#if graded.length}
    <CardFilter bind:state={filter} sorts={['name', 'price_desc', 'price_asc']} total={graded.length} shown={shownGraded.length} />
  {/if}
  {#if graded.length && !shownGraded.length}<div class="hint">{t('coll.noFilterMatch')}</div>{/if}
  <div class="grid">
    {#each shownGraded as x (x.id)}
      <div class="card" class:busy={busy === x.id}>
        <span class="gbadge {x.company}">{x.company} {x.grade}</span>
        {#if x.image_url}<img src={x.image_url} alt={x.name} loading="lazy" style="cursor:zoom-in" onclick={() => startEditGraded(x)} />{:else}<div class="boxph">🎴</div>{/if}
        <div class="meta">
          <div class="name">{x.name}</div>
          <div class="set">{x.set_name ?? ''}{#if x.number}{' · '}{x.number}{/if}{#if x.cert}{' · '}Cert {x.cert}{/if}</div>
          <div class="price">{x.value != null ? fmt(x.value, x.currency ?? 'USD') : t('coll.noPrice')}</div>
          {#if x.purchase_price != null}
            <div class="subline"><span class="ek">{t('ex.buyShort', { v: fmt(x.purchase_price, x.currency ?? 'USD') })}</span>{#if x.value != null}<span class="pl" class:pos={(x.value - x.purchase_price) >= 0}>{(x.value - x.purchase_price) >= 0 ? '+' : ''}{fmt(x.value - x.purchase_price, x.currency ?? 'USD')}</span>{/if}</div>
          {/if}
        </div>
        <div class="card-actions">
          <button class="act" onclick={() => startEditGraded(x)} disabled={busy === x.id}>{t('ex.edit')}</button>
          <button class="act delx" onclick={() => delGraded(x)} disabled={busy === x.id} title={t('alerts.delete')}>✕</button>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .coll-head { display: flex; align-items: center; justify-content: space-between; margin: 8px 0 14px; gap: 12px; flex-wrap: wrap; }
  .modes { display: flex; gap: 6px; }
  .modes button { padding: 8px 18px; border-radius: 999px; border: 1px solid #2a2f3a; background: transparent; color: inherit; font-weight: 600; cursor: pointer; }
  .modes button.active { background: var(--accent, #6366f1); border-color: transparent; color: #fff; }
  .right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .muted { color: var(--muted, #9aa0ad); font-size: 14px; }
  .primary { padding: 8px 14px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
  .addform { background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 12px; padding: 16px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 12px; }
  .ov { position: fixed; inset: 0; background: rgba(6,8,14,0.66); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
  .dlg { position: relative; margin: 0; width: 100%; max-width: 520px; max-height: 92vh; overflow-y: auto; -webkit-overflow-scrolling: touch; box-shadow: var(--shadow-lg, 0 24px 60px -18px rgba(0,0,0,.65)); }
  .x { position: absolute; top: 10px; right: 12px; width: 32px; height: 32px; border-radius: 999px; border: 1px solid #2a2f3a; background: rgba(0,0,0,0.3); color: var(--muted, #9aa0ad); cursor: pointer; }
  .x:hover { color: var(--text, #e7e9ee); }
  .modaldel { align-self: flex-start; padding: 8px 14px; border-radius: 8px; border: 1px solid #3a1620; background: transparent; color: #fca5a5; cursor: pointer; font-weight: 600; }
  .modaldel:hover { background: rgba(252,165,165,0.08); }
  @media (max-width: 560px) { .ov { padding: 0; align-items: flex-end; } .dlg { max-width: 100%; max-height: 94vh; border-radius: 16px 16px 0 0; margin-bottom: 0; } }
  .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
  .addform label { display: flex; flex-direction: column; gap: 3px; font-size: 0.8rem; color: var(--muted); }
  .addform input, .addform select { padding: 8px 10px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .addform .primary { align-self: flex-start; }
  .formtitle { font-weight: 700; font-size: 0.95rem; color: var(--text, #e7e9ee); }
  .imgfield { display: flex; flex-direction: column; gap: 6px; }
  .imgfield-l { font-size: 0.8rem; color: var(--muted); }
  .sellbox { border-top: 1px dashed #2a2f3a; padding-top: 12px; margin-top: 4px; display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
  .selllabel { display: flex; flex-direction: column; gap: 3px; font-size: 0.8rem; color: var(--muted); }
  .selllabel input { padding: 8px 10px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .sellbtn { padding: 9px 14px; border-radius: 8px; border: 1px solid #3a2a16; background: transparent; color: #f5c451; cursor: pointer; font-weight: 600; }
  .sellbtn:hover { background: rgba(245,196,81,0.1); }
  .filterbar { margin-bottom: 12px; }
  .filterbar label { display: inline-flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--muted, #9aa0ad); }
  .filterbar select { padding: 8px 10px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .card.busy { opacity: 0.55; pointer-events: none; }
  .boxph { aspect-ratio: 5 / 7; display: flex; align-items: center; justify-content: center; font-size: 2.6rem; background: #0a0c10; }
  .gbadge { position: absolute; top: 9px; left: 9px; z-index: 1; font-size: 0.6rem; font-weight: 800; letter-spacing: 0.04em; padding: 4px 8px; border-radius: 6px; color: #fff; background: var(--surface-3, #232a38); box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,.35)); }
  .gbadge.PSA { background: #b3122b; }
  .gbadge.BGS { background: #1d3b6e; }
  .gbadge.CGC { background: #0b7a5e; }
  .gbadge.SGC { background: #3a3a3a; }
  .subline { display: flex; gap: 8px; flex-wrap: wrap; align-items: baseline; margin-top: 3px; }
  .ek { color: var(--muted, #9aa0ad); font-size: 0.72rem; font-variant-numeric: tabular-nums; }
  .pl { font-size: 0.72rem; font-weight: 700; color: #fca5a5; font-variant-numeric: tabular-nums; }
  .pl.pos { color: #86efac; }
  .card-actions .act { flex: 1; padding: 9px 8px; border: 0; border-right: 1px solid var(--border, #2a2f3a); background: transparent; color: var(--muted, #9aa0ad); cursor: pointer; font-size: 0.82rem; font-weight: 600; }
  .card-actions .act:last-child { border-right: 0; }
  .card-actions .act:hover { background: var(--surface-2, #1b202b); color: var(--text, #e7e9ee); }
  .card-actions .act.delx { flex: 0 0 auto; color: #fca5a5; }
  .card-actions .act:disabled { opacity: 0.5; cursor: default; }
</style>
