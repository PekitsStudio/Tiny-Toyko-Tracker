<script lang="ts">
  import Dashboard from '$lib/features/dashboard/Dashboard.svelte';
  import Search from '$lib/features/search/Search.svelte';
  import Collection from '$lib/features/collection/Collection.svelte';
  import Wishlist from '$lib/features/wishlist/Wishlist.svelte';
  import Market from '$lib/features/market/Market.svelte';
  import Sold from '$lib/features/sold/Sold.svelte';
  import Profile from '$lib/features/profile/Profile.svelte';
  import CardDetail from '$lib/components/CardDetail.svelte';
  import PublicProfile from '$lib/components/PublicProfile.svelte';
  import { nav } from '$lib/stores/nav.svelte';
</script>

<nav class="tabs">
  <button class:active={nav.tab === 'start'} onclick={() => nav.go('start')}>Start</button>
  <button class:active={nav.tab === 'suche'} onclick={() => nav.go('suche')}>Suche</button>
  <button class:active={nav.tab === 'sammlung'} onclick={() => nav.go('sammlung')}>Sammlung</button>
  <button class:active={nav.tab === 'wunschliste'} onclick={() => nav.go('wunschliste')}>Wunschliste</button>
  <button class:active={nav.tab === 'marktplatz'} onclick={() => nav.go('marktplatz')}>Marktplatz</button>
  <button class:active={nav.tab === 'verkauft'} onclick={() => nav.go('verkauft')}>Verkauft</button>
  <button class:active={nav.tab === 'profil'} onclick={() => nav.go('profil')}>Profil</button>
</nav>

<main>
  {#if nav.tab === 'start'}<Dashboard />
  {:else if nav.tab === 'suche'}<Search />
  {:else if nav.tab === 'sammlung'}<Collection />
  {:else if nav.tab === 'wunschliste'}<Wishlist />
  {:else if nav.tab === 'marktplatz'}<Market />
  {:else if nav.tab === 'verkauft'}<Sold />
  {:else}<Profile />{/if}
</main>

<CardDetail />
<PublicProfile />

<style>
  .tabs { display: flex; gap: 6px; max-width: 1100px; margin: 16px auto 0; padding: 0 16px; flex-wrap: wrap; }
  .tabs button { padding: 9px 18px; border-radius: 999px; border: 1px solid #2a2f3a; background: transparent; color: inherit; font-weight: 600; cursor: pointer; }
  .tabs button.active { background: var(--accent, #6366f1); border-color: transparent; color: #fff; }
  main { max-width: 1100px; margin: 0 auto; padding: 16px 16px 60px; }
</style>
