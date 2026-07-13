<script lang="ts">
  import Profile from '$lib/features/profile/Profile.svelte';
  import Messages from '$lib/features/social/Messages.svelte';
  import Friends from '$lib/features/social/Friends.svelte';
  import { social } from '$lib/stores/social.svelte';

  let sub = $state<'profil' | 'nachrichten' | 'freunde'>('profil');
  $effect(() => { if (social.chatWith) sub = 'nachrichten'; });
</script>

<div class="subnav">
  <button class:active={sub === 'profil'} onclick={() => (sub = 'profil')}>Mein Profil</button>
  <button class:active={sub === 'nachrichten'} onclick={() => (sub = 'nachrichten')}>Nachrichten</button>
  <button class:active={sub === 'freunde'} onclick={() => (sub = 'freunde')}>Freunde</button>
</div>

{#if sub === 'profil'}<Profile />
{:else if sub === 'nachrichten'}<Messages />
{:else}<Friends />{/if}

<style>
  .subnav { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
  .subnav button { padding: 7px 14px; border-radius: 8px; border: 1px solid #232833; background: transparent; color: var(--muted, #9aa0ad); cursor: pointer; font-size: 0.9rem; }
  .subnav button.active { background: #1c2130; color: var(--text, #e7e9ee); border-color: #2a2f3a; font-weight: 600; }
</style>
