<script lang="ts">
  import Collection from '$lib/features/collection/Collection.svelte';
  import Wishlist from '$lib/features/wishlist/Wishlist.svelte';
  import Extras from '$lib/features/extras/Extras.svelte';
  import Sold from '$lib/features/sold/Sold.svelte';
  import Showcases from '$lib/features/showcase/Showcases.svelte';
  import Statistik from '$lib/features/stats/Statistik.svelte';
  let sub = $state<'sammlung' | 'wunschliste' | 'extras' | 'verkauft' | 'showcases' | 'statistik'>('sammlung');
</script>

<div class="subnav">
  <button class:active={sub === 'sammlung'} onclick={() => (sub = 'sammlung')}>Meine Sammlung</button>
  <button class:active={sub === 'wunschliste'} onclick={() => (sub = 'wunschliste')}>Wunschliste</button>
  <button class:active={sub === 'extras'} onclick={() => (sub = 'extras')}>Sealed/Graded</button>
  <button class:active={sub === 'verkauft'} onclick={() => (sub = 'verkauft')}>Verkauft</button>
  <button class:active={sub === 'showcases'} onclick={() => (sub = 'showcases')}>Showcases</button>
  <button class:active={sub === 'statistik'} onclick={() => (sub = 'statistik')}>Statistik</button>
</div>

{#if sub === 'sammlung'}<Collection />
{:else if sub === 'wunschliste'}<Wishlist />
{:else if sub === 'extras'}<Extras />
{:else if sub === 'verkauft'}<Sold />
{:else if sub === 'showcases'}<Showcases only="meine" />
{:else}<Statistik />{/if}

<style>
  .subnav { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
  .subnav button { padding: 7px 14px; border-radius: 8px; border: 1px solid #232833; background: transparent; color: var(--muted, #9aa0ad); cursor: pointer; font-size: 0.9rem; }
  .subnav button.active { background: #1c2130; color: var(--text, #e7e9ee); border-color: #2a2f3a; font-weight: 600; }
</style>
