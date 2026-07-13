<script lang="ts">
  import Collection from '$lib/features/collection/Collection.svelte';
  import Wishlist from '$lib/features/wishlist/Wishlist.svelte';
  import Extras from '$lib/features/extras/Extras.svelte';
  import Sold from '$lib/features/sold/Sold.svelte';
  import Showcases from '$lib/features/showcase/Showcases.svelte';
  import Statistik from '$lib/features/stats/Statistik.svelte';
  import Export from '$lib/features/exporting/Export.svelte';
  import Alerts from '$lib/features/alerts/Alerts.svelte';
  let sub = $state<'sammlung' | 'wunschliste' | 'extras' | 'verkauft' | 'showcases' | 'statistik' | 'export' | 'alerts'>('sammlung');
</script>

<div class="subnav">
  <button class:active={sub === 'sammlung'} onclick={() => (sub = 'sammlung')}>Meine Sammlung</button>
  <button class:active={sub === 'wunschliste'} onclick={() => (sub = 'wunschliste')}>Wunschliste</button>
  <button class:active={sub === 'extras'} onclick={() => (sub = 'extras')}>Sealed/Graded</button>
  <button class:active={sub === 'verkauft'} onclick={() => (sub = 'verkauft')}>Verkauft</button>
  <button class:active={sub === 'showcases'} onclick={() => (sub = 'showcases')}>Showcases</button>
  <button class:active={sub === 'statistik'} onclick={() => (sub = 'statistik')}>Statistik</button>
  <button class:active={sub === 'export'} onclick={() => (sub = 'export')}>Exportieren</button>
  <button class:active={sub === 'alerts'} onclick={() => (sub = 'alerts')}>Preisalarme</button>
</div>

{#if sub === 'sammlung'}<Collection />
{:else if sub === 'wunschliste'}<Wishlist />
{:else if sub === 'extras'}<Extras />
{:else if sub === 'verkauft'}<Sold />
{:else if sub === 'showcases'}<Showcases only="meine" />
{:else if sub === 'statistik'}<Statistik />
{:else if sub === 'export'}<Export />
{:else}<Alerts />{/if}

<style>
  .subnav { display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
  .subnav::-webkit-scrollbar { display: none; }
  .subnav button { flex: 0 0 auto; padding: 8px 15px; border-radius: 999px; border: 1px solid var(--border, #272e3b); background: var(--surface, #14181f); color: var(--muted, #95a1b4); cursor: pointer; font-size: 0.88rem; font-weight: 600; white-space: nowrap; box-shadow: none; transition: var(--trans, 0.16s ease); }
  .subnav button:hover { color: var(--text, #eaedf3); border-color: var(--border-strong, #38414f); transform: none; }
  .subnav button.active { background: var(--accent, #6e7cff); color: var(--on-accent, #fff); border-color: transparent; }
</style>
