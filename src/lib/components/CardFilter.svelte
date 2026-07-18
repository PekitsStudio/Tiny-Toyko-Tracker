<script lang="ts">
  import { SORT_LABEL, type FilterState, type SortKey, type GameChip } from '$lib/features/collection/filter';

  let {
    state = $bindable(),
    games = [],
    sorts = ['name', 'price_desc', 'price_asc'] as SortKey[],
    total = 0,
    shown = 0,
    placeholder = 'Suchen (Name, Set, Nummer)…'
  }: {
    state: FilterState;
    games?: GameChip[];
    sorts?: SortKey[];
    total?: number;
    shown?: number;
    placeholder?: string;
  } = $props();

  const active = $derived(state.q.trim() !== '' || state.game !== '');
  function reset() { state.q = ''; state.game = ''; }
</script>

<div class="cf">
  <div class="row1">
    <div class="search">
      <span class="ico">🔍</span>
      <input type="search" bind:value={state.q} {placeholder} />
      {#if state.q}<button class="clr" onclick={() => (state.q = '')} aria-label="Suche leeren">✕</button>{/if}
    </div>
    <label class="sortsel">
      <span>Sortieren</span>
      <select bind:value={state.sort}>
        {#each sorts as s (s)}<option value={s}>{SORT_LABEL[s]}</option>{/each}
      </select>
    </label>
  </div>

  {#if games.length > 1}
    <div class="chips">
      <button class:on={state.game === ''} onclick={() => (state.game = '')}>Alle ({total})</button>
      {#each games as g (g.key)}
        <button class:on={state.game === g.key} onclick={() => (state.game = state.game === g.key ? '' : g.key)}>{g.label} ({g.n})</button>
      {/each}
    </div>
  {/if}

  {#if active}
    <div class="statusline">{shown} von {total} · <button class="reset" onclick={reset}>Filter zurücksetzen</button></div>
  {/if}
</div>

<style>
  .cf { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
  .row1 { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .search { position: relative; flex: 1 1 240px; min-width: 0; display: flex; align-items: center; }
  .search .ico { position: absolute; left: 11px; font-size: 0.85rem; opacity: 0.7; pointer-events: none; }
  .search input { width: 100%; padding: 9px 32px 9px 32px; border-radius: 10px; border: 1px solid var(--border, #272e3b); background: #12151d; color: var(--text, #e7e9ee); font: inherit; }
  .search input:focus { outline: none; border-color: var(--accent, #6e7cff); }
  .search .clr { position: absolute; right: 8px; width: 22px; height: 22px; border-radius: 999px; border: 0; background: var(--surface-2, #1b202b); color: var(--muted, #95a1b4); cursor: pointer; font-size: 0.75rem; }
  .sortsel { display: inline-flex; align-items: center; gap: 7px; font-size: 0.8rem; color: var(--muted, #95a1b4); white-space: nowrap; }
  .sortsel select { padding: 9px 10px; border-radius: 10px; border: 1px solid var(--border, #272e3b); background: #12151d; color: var(--text, #e7e9ee); font: inherit; cursor: pointer; }

  .chips { display: flex; gap: 7px; flex-wrap: wrap; }
  .chips button { padding: 6px 13px; border-radius: 999px; border: 1px solid var(--border, #272e3b); background: var(--surface, #14181f); color: var(--muted, #95a1b4); cursor: pointer; font-size: 0.82rem; font-weight: 600; white-space: nowrap; transition: var(--trans, 0.16s ease); }
  .chips button:hover { color: var(--text, #eaedf3); border-color: var(--border-strong, #38414f); }
  .chips button.on { background: var(--accent, #6e7cff); color: var(--on-accent, #fff); border-color: transparent; }

  .statusline { font-size: 0.78rem; color: var(--muted, #95a1b4); }
  .reset { background: none; border: 0; padding: 0; color: var(--accent, #6e7cff); font: inherit; font-size: 0.78rem; cursor: pointer; text-decoration: underline; }
</style>
