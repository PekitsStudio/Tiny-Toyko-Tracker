<script lang="ts">
  import Search from '$lib/features/search/Search.svelte';
  import Collection from '$lib/features/collection/Collection.svelte';

  let tab = $state<'suche' | 'sammlung'>('suche');
</script>

<nav class="tabs">
  <button class:active={tab === 'suche'} onclick={() => (tab = 'suche')}>Suche</button>
  <button class:active={tab === 'sammlung'} onclick={() => (tab = 'sammlung')}>Sammlung</button>
</nav>

<main>
  {#if tab === 'suche'}
    <Search />
  {:else}
    <Collection />
  {/if}
</main>

<style>
  .tabs {
    display: flex;
    gap: 6px;
    max-width: 1100px;
    margin: 16px auto 0;
    padding: 0 16px;
  }
  .tabs button {
    padding: 9px 18px;
    border-radius: 999px;
    border: 1px solid #2a2f3a;
    background: transparent;
    color: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .tabs button.active {
    background: var(--accent, #6366f1);
    border-color: transparent;
    color: #fff;
  }
  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 16px 16px 60px;
  }
</style>
