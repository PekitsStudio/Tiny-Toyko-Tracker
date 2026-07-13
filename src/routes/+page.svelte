<script lang="ts">
  import Dashboard from '$lib/features/dashboard/Dashboard.svelte';
  import Search from '$lib/features/search/Search.svelte';
  import CollectionSection from '$lib/sections/CollectionSection.svelte';
  import MarketSection from '$lib/sections/MarketSection.svelte';
  import CommunitySection from '$lib/sections/CommunitySection.svelte';
  import ProfileSection from '$lib/sections/ProfileSection.svelte';
  import CardDetail from '$lib/components/CardDetail.svelte';
  import PublicProfile from '$lib/components/PublicProfile.svelte';
  import { nav } from '$lib/stores/nav.svelte';
</script>

<nav class="tabs">
  <button class:active={nav.tab === 'start'} onclick={() => nav.go('start')}>Start</button>
  <button class:active={nav.tab === 'suche'} onclick={() => nav.go('suche')}>Suche</button>
  <button class:active={nav.tab === 'sammlung'} onclick={() => nav.go('sammlung')}>Sammlung</button>
  <button class:active={nav.tab === 'marktplatz'} onclick={() => nav.go('marktplatz')}>Marktplatz</button>
  <button class:active={nav.tab === 'community'} onclick={() => nav.go('community')}>Community</button>
  <button class:active={nav.tab === 'profil'} onclick={() => nav.go('profil')}>Profil</button>
</nav>

<main>
  {#if nav.tab === 'start'}<Dashboard />
  {:else if nav.tab === 'suche'}<Search />
  {:else if nav.tab === 'sammlung'}<CollectionSection />
  {:else if nav.tab === 'marktplatz'}<MarketSection />
  {:else if nav.tab === 'community'}<CommunitySection />
  {:else}<ProfileSection />{/if}
</main>

<CardDetail />
<PublicProfile />

<style>
  .tabs {
    position: sticky; top: 0; z-index: 50;
    display: flex; gap: 6px; flex-wrap: nowrap;
    max-width: 1100px; margin: 0 auto; padding: 12px 16px;
    overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch;
    background: color-mix(in srgb, var(--bg, #0b0d13) 88%, transparent);
    backdrop-filter: saturate(140%) blur(10px);
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tabs button {
    flex: 0 0 auto; padding: 9px 18px; border-radius: 999px;
    border: 1px solid var(--border, #272e3b); background: var(--surface, #14181f);
    color: var(--muted, #95a1b4); font-weight: 600; cursor: pointer; white-space: nowrap;
    box-shadow: none; transition: var(--trans, 0.16s ease);
  }
  .tabs button:hover { color: var(--text, #eaedf3); border-color: var(--border-strong, #38414f); transform: none; }
  .tabs button.active { background: var(--accent, #6e7cff); border-color: transparent; color: var(--on-accent, #fff); }
  main { max-width: 1100px; margin: 0 auto; padding: 16px 16px 60px; }
  @media (max-width: 640px) {
    .tabs { padding: 10px 12px; gap: 5px; }
    .tabs button { padding: 8px 14px; font-size: 0.88rem; }
    main { padding: 14px 12px 72px; }
  }
</style>
