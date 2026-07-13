<script lang="ts">
  import Market from '$lib/features/market/Market.svelte';
  import Trades from '$lib/features/trades/Trades.svelte';
  let sub = $state<'angebote' | 'suche' | 'handel'>('angebote');
</script>

<div class="subnav">
  <button class:active={sub === 'angebote'} onclick={() => (sub = 'angebote')}>Angebote</button>
  <button class:active={sub === 'suche'} onclick={() => (sub = 'suche')}>Suche</button>
  <button class:active={sub === 'handel'} onclick={() => (sub = 'handel')}>Handel</button>
</div>

{#if sub === 'angebote'}<Market only="angebote" />
{:else if sub === 'suche'}<Market only="suche" />
{:else}<Trades />{/if}

<style>
  .subnav { display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
  .subnav::-webkit-scrollbar { display: none; }
  .subnav button { flex: 0 0 auto; padding: 8px 15px; border-radius: 999px; border: 1px solid var(--border, #272e3b); background: var(--surface, #14181f); color: var(--muted, #95a1b4); cursor: pointer; font-size: 0.88rem; font-weight: 600; white-space: nowrap; box-shadow: none; transition: var(--trans, 0.16s ease); }
  .subnav button:hover { color: var(--text, #eaedf3); border-color: var(--border-strong, #38414f); transform: none; }
  .subnav button.active { background: var(--accent, #6e7cff); color: var(--on-accent, #fff); border-color: transparent; }
</style>
