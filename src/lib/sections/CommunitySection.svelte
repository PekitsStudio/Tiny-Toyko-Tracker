<script lang="ts">
  import Showcases from '$lib/features/showcase/Showcases.svelte';
  import Posts from '$lib/features/community/Posts.svelte';
  import Forum from '$lib/features/community/Forum.svelte';
  import Chat from '$lib/features/community/Chat.svelte';
  let sub = $state<'showcases' | 'pulls' | 'guides' | 'reviews' | 'forum' | 'chat'>('showcases');
</script>

<div class="subnav">
  <button class:active={sub === 'showcases'} onclick={() => (sub = 'showcases')}>Showcases</button>
  <button class:active={sub === 'pulls'} onclick={() => (sub = 'pulls')}>Pulls</button>
  <button class:active={sub === 'guides'} onclick={() => (sub = 'guides')}>Guides</button>
  <button class:active={sub === 'reviews'} onclick={() => (sub = 'reviews')}>Reviews</button>
  <button class:active={sub === 'forum'} onclick={() => (sub = 'forum')}>Forum</button>
  <button class:active={sub === 'chat'} onclick={() => (sub = 'chat')}>Chat</button>
</div>

{#if sub === 'showcases'}<Showcases only="entdecken" />
{:else if sub === 'pulls'}<Posts kind="pulls" label="Pulls" />
{:else if sub === 'guides'}<Posts kind="guide" label="Guides" />
{:else if sub === 'reviews'}<Posts kind="review" label="Reviews" />
{:else if sub === 'forum'}<Forum />
{:else}<Chat />{/if}

<style>
  .subnav { display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
  .subnav::-webkit-scrollbar { display: none; }
  .subnav button { flex: 0 0 auto; padding: 8px 15px; border-radius: 999px; border: 1px solid var(--border, #272e3b); background: var(--surface, #14181f); color: var(--muted, #95a1b4); cursor: pointer; font-size: 0.88rem; font-weight: 600; white-space: nowrap; box-shadow: none; transition: var(--trans, 0.16s ease); }
  .subnav button:hover { color: var(--text, #eaedf3); border-color: var(--border-strong, #38414f); transform: none; }
  .subnav button.active { background: var(--accent, #6e7cff); color: var(--on-accent, #fff); border-color: transparent; }
</style>
