<script lang="ts">
  import Showcases from '$lib/features/showcase/Showcases.svelte';
  import Posts from '$lib/features/community/Posts.svelte';
  import Forum from '$lib/features/community/Forum.svelte';
  let sub = $state<'showcases' | 'pulls' | 'guides' | 'reviews' | 'forum'>('showcases');
</script>

<div class="subnav">
  <button class:active={sub === 'showcases'} onclick={() => (sub = 'showcases')}>Showcases</button>
  <button class:active={sub === 'pulls'} onclick={() => (sub = 'pulls')}>Pulls</button>
  <button class:active={sub === 'guides'} onclick={() => (sub = 'guides')}>Guides</button>
  <button class:active={sub === 'reviews'} onclick={() => (sub = 'reviews')}>Reviews</button>
  <button class:active={sub === 'forum'} onclick={() => (sub = 'forum')}>Forum</button>
</div>

{#if sub === 'showcases'}<Showcases only="entdecken" />
{:else if sub === 'pulls'}<Posts kind="pulls" label="Pulls" />
{:else if sub === 'guides'}<Posts kind="guide" label="Guides" />
{:else if sub === 'reviews'}<Posts kind="review" label="Reviews" />
{:else}<Forum />{/if}

<style>
  .subnav { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
  .subnav button { padding: 7px 14px; border-radius: 8px; border: 1px solid #232833; background: transparent; color: var(--muted, #9aa0ad); cursor: pointer; font-size: 0.9rem; }
  .subnav button.active { background: #1c2130; color: var(--text, #e7e9ee); border-color: #2a2f3a; font-weight: 600; }
</style>
