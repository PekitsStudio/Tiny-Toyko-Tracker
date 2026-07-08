<script lang="ts">
  import Search from '$lib/features/search/Search.svelte';
  import Collection from '$lib/features/collection/Collection.svelte';
  import Wishlist from '$lib/features/wishlist/Wishlist.svelte';
  import Market from '$lib/features/market/Market.svelte';
  import Profile from '$lib/features/profile/Profile.svelte';
  import CardDetail from '$lib/components/CardDetail.svelte';

  let tab = $state<'suche' | 'sammlung' | 'wunschliste' | 'marktplatz' | 'profil'>('suche');
</script>

<nav class="tabs">
  <button class:active={tab === 'suche'} onclick={() => (tab = 'suche')}>Suche</button>
  <button class:active={tab === 'sammlung'} onclick={() => (tab = 'sammlung')}>Sammlung</button>
  <button class:active={tab === 'wunschliste'} onclick={() => (tab = 'wunschliste')}>Wunschliste</button>
  <button class:active={tab === 'marktplatz'} onclick={() => (tab = 'marktplatz')}>Marktplatz</button>
  <button class:active={tab === 'profil'} onclick={() => (tab = 'profil')}>Profil</button>
</nav>

<main>
  {#if tab === 'suche'}<Search />
  {:else if tab === 'sammlung'}<Collection />
  {:else if tab === 'wunschliste'}<Wishlist />
  {:else if tab === 'marktplatz'}<Market />
  {:else}<Profile />{/if}
</main>

<CardDetail />

<style>
  .tabs { display: flex; gap: 6px; max-width: 1100px; margin: 16px auto 0; padding: 0 16px; flex-wrap: wrap; }
  .tabs button { padding: 9px 18px; border-radius: 999px; border: 1px solid #2a2f3a; background: transparent; color: inherit; font-weight: 600; cursor: pointer; }
  .tabs button.active { background: var(--accent, #6366f1); border-color: transparent; color: #fff; }
  main { max-width: 1100px; margin: 0 auto; padding: 16px 16px 60px; }
</style>
