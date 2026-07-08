<script lang="ts">
  import { onMount } from 'svelte';
  import { listSealed, addSealed, deleteSealed, listGraded, addGraded, deleteGraded, type SealedItem, type GradedCard } from '$lib/services/extras.service';
  import { fmt, GAME_LABEL } from '$lib/format';

  let mode = $state<'sealed' | 'graded'>('sealed');
  let sealed = $state<SealedItem[]>([]); let graded = $state<GradedCard[]>([]);
  let status = $state(''); let loading = $state(false); let busy = $state<number | null>(null);
  let showAdd = $state(false);

  const GAMES = ['pokemon', 'magic', 'yugioh', 'onepiece'];
  const COMPANIES = ['PSA', 'BGS', 'CGC', 'SGC', 'Andere'];

  let sf = $state({ name: '', game: 'pokemon', product_type: 'Display', set_name: '', quantity: 1, purchase_price: null as number | null, current_value: null as number | null });
  let gf = $state({ name: '', set_name: '', number: '', company: 'PSA', grade: '10', cert: '', value: null as number | null, purchase_price: null as number | null });

  async function load() {
    loading = true; status = '';
    try { if (mode === 'sealed') sealed = await listSealed(); else graded = await listGraded(); }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(load);
  function switchMode(m: 'sealed' | 'graded') { mode = m; showAdd = false; status = ''; load(); }

  const sealedTotal = $derived(sealed.reduce((s, x) => s + (x.current_value ?? 0) * (x.quantity ?? 1), 0));
  const gradedTotal = $derived(graded.reduce((s, x) => s + (x.value ?? 0), 0));

  async function submitSealed() {
    if (!sf.name.trim()) return; busy = -1;
    try { await addSealed({ ...sf, name: sf.name.trim() }); showAdd = false; sf = { name: '', game: 'pokemon', product_type: 'Display', set_name: '', quantity: 1, purchase_price: null, current_value: null }; await load(); }
    catch (e) { status = (e as Error).message; } finally { busy = null; }
  }
  async function submitGraded() {
    if (!gf.name.trim() || !gf.grade.trim()) return; busy = -1;
    try { await addGraded({ ...gf, name: gf.name.trim() }); showAdd = false; gf = { name: '', set_name: '', number: '', company: 'PSA', grade: '10', cert: '', value: null, purchase_price: null }; await load(); }
    catch (e) { status = (e as Error).message; } finally { busy = null; }
  }
  async function delSealed(x: SealedItem) { if (!confirm(`„${x.name}" löschen?`)) return; busy = x.id; try { await deleteSealed(x.id); sealed = sealed.filter((y) => y.id !== x.id); } catch (e) { status = (e as Error).message; } finally { busy = null; } }
  async function delGraded(x: GradedCard) { if (!confirm(`„${x.name}" löschen?`)) return; busy = x.id; try { await deleteGraded(x.id); graded = graded.filter((y) => y.id !== x.id); } catch (e) { status = (e as Error).message; } finally { busy = null; } }
</script>

<div class="coll-head">
  <div class="modes">
    <button class:active={mode === 'sealed'} onclick={() => switchMode('sealed')}>Versiegelt</button>
    <button class:active={mode === 'graded'} onclick={() => switchMode('graded')}>Graded</button>
  </div>
  <div class="right">
    <span class="muted">{mode === 'sealed' ? sealed.length + ' Produkte · ' + fmt(sealedTotal) : graded.length + ' Karten · ' + fmt(gradedTotal, 'USD')}</span>
    <button class="primary" onclick={() => (showAdd = !showAdd)}>{showAdd ? 'Abbrechen' : '+ Hinzufügen'}</button>
  </div>
</div>

{#if showAdd}
  <div class="addform">
    {#if mode === 'sealed'}
      <div class="grid2">
        <label>Name<input bind:value={sf.name} placeholder="z. B. Display Obsidian Flames" /></label>
        <label>Spiel<select bind:value={sf.game}>{#each GAMES as g}<option value={g}>{GAME_LABEL[g] ?? g}</option>{/each}</select></label>
        <label>Produkttyp<input bind:value={sf.product_type} placeholder="Display, ETB, Booster…" /></label>
        <label>Set<input bind:value={sf.set_name} placeholder="Set-Name (optional)" /></label>
        <label>Menge<input type="number" min="1" bind:value={sf.quantity} /></label>
        <label>Kaufpreis (€)<input type="number" min="0" step="0.01" bind:value={sf.purchase_price} /></label>
        <label>Aktueller Wert (€)<input type="number" min="0" step="0.01" bind:value={sf.current_value} /></label>
      </div>
      <button class="primary" onclick={submitSealed} disabled={busy === -1 || !sf.name.trim()}>Speichern</button>
    {:else}
      <div class="grid2">
        <label>Name<input bind:value={gf.name} placeholder="z. B. Charizard" /></label>
        <label>Set<input bind:value={gf.set_name} placeholder="Set (optional)" /></label>
        <label>Nummer<input bind:value={gf.number} placeholder="z. B. 4/102" /></label>
        <label>Firma<select bind:value={gf.company}>{#each COMPANIES as c}<option>{c}</option>{/each}</select></label>
        <label>Grade<input bind:value={gf.grade} placeholder="z. B. 10, 9.5" /></label>
        <label>Zertifikat<input bind:value={gf.cert} placeholder="Cert-Nr. (optional)" /></label>
        <label>Wert ($)<input type="number" min="0" step="0.01" bind:value={gf.value} /></label>
        <label>Kaufpreis ($)<input type="number" min="0" step="0.01" bind:value={gf.purchase_price} /></label>
      </div>
      <button class="primary" onclick={submitGraded} disabled={busy === -1 || !gf.name.trim()}>Speichern</button>
    {/if}
  </div>
{/if}

{#if status}<div class="hint">{status}</div>{/if}

{#if mode === 'sealed'}
  {#if !sealed.length && !loading}<div class="hint">Noch keine versiegelten Produkte.</div>{/if}
  <div class="list">
    {#each sealed as x (x.id)}
      <div class="row" class:busy={busy === x.id}>
        <div><div class="rn">{x.name}</div><div class="rs">{GAME_LABEL[x.game] ?? x.game} · {x.product_type}{#if x.set_name} · {x.set_name}{/if}{#if x.quantity > 1} · ×{x.quantity}{/if}</div></div>
        <div class="rv">{x.current_value != null ? fmt(x.current_value, x.currency ?? 'EUR') : '—'}</div>
        <button class="del" onclick={() => delSealed(x)} disabled={busy === x.id}>✕</button>
      </div>
    {/each}
  </div>
{:else}
  {#if !graded.length && !loading}<div class="hint">Noch keine gegradeten Karten.</div>{/if}
  <div class="list">
    {#each graded as x (x.id)}
      <div class="row" class:busy={busy === x.id}>
        <div><div class="rn">{x.name} <span class="grade">{x.company} {x.grade}</span></div><div class="rs">{x.set_name ?? ''}{#if x.number} · {x.number}{/if}{#if x.cert} · Cert {x.cert}{/if}</div></div>
        <div class="rv">{x.value != null ? fmt(x.value, x.currency ?? 'USD') : '—'}</div>
        <button class="del" onclick={() => delGraded(x)} disabled={busy === x.id}>✕</button>
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
  .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
  .addform label { display: flex; flex-direction: column; gap: 3px; font-size: 0.8rem; color: var(--muted); }
  .addform input, .addform select { padding: 8px 10px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .addform .primary { align-self: flex-start; }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: center; gap: 14px; background: var(--surface, #171a23); border: 1px solid #232833; border-radius: 10px; padding: 12px 14px; }
  .row.busy { opacity: 0.55; pointer-events: none; }
  .row > div:first-child { flex: 1; }
  .rn { font-weight: 600; }
  .grade { color: var(--gold, #f5c451); font-size: 0.8rem; margin-left: 6px; }
  .rs { color: var(--muted); font-size: 0.8rem; margin-top: 2px; }
  .rv { color: var(--gold, #f5c451); font-weight: 700; }
  .del { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #3a1620; background: transparent; color: #fca5a5; cursor: pointer; }
</style>
