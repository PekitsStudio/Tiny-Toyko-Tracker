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
  .subnav { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
  .subnav button { padding: 7px 14px; border-radius: 8px; border: 1px solid #232833; background: transparent; color: var(--muted, #9aa0ad); cursor: pointer; font-size: 0.9rem; }
  .subnav button.active { background: #1c2130; color: var(--text, #e7e9ee); border-color: #2a2f3a; font-weight: 600; }
</style>
