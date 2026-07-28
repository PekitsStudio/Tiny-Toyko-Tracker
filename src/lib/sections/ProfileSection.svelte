<script lang="ts">
  import Profile from '$lib/features/profile/Profile.svelte';
  import Messages from '$lib/features/social/Messages.svelte';
  import Friends from '$lib/features/social/Friends.svelte';
  import Settings from '$lib/features/settings/Settings.svelte';
  import Export from '$lib/features/exporting/Export.svelte';
  import Progress from '$lib/features/progress/Progress.svelte';
  import AvatarShop from '$lib/features/shop/AvatarShop.svelte';
  import { social } from '$lib/stores/social.svelte';
  import { i18n } from '$lib/i18n.svelte';

  let sub = $state<'profil' | 'fortschritt' | 'shop' | 'nachrichten' | 'freunde' | 'export' | 'einstellungen'>('profil');
  $effect(() => { if (social.chatWith) sub = 'nachrichten'; });
</script>

<div class="subnav">
  <button class:active={sub === 'profil'} onclick={() => (sub = 'profil')}>{i18n.t('psub.profile')}</button>
  <button class:active={sub === 'fortschritt'} onclick={() => (sub = 'fortschritt')}>{i18n.t('psub.progress')}</button>
  <button class:active={sub === 'shop'} onclick={() => (sub = 'shop')}>{i18n.t('psub.shop')}</button>
  <button class:active={sub === 'nachrichten'} onclick={() => (sub = 'nachrichten')}>{i18n.t('psub.messages')}</button>
  <button class:active={sub === 'freunde'} onclick={() => (sub = 'freunde')}>{i18n.t('psub.friends')}</button>
  <button class:active={sub === 'export'} onclick={() => (sub = 'export')}>{i18n.t('psub.exportImport')}</button>
  <button class:active={sub === 'einstellungen'} onclick={() => (sub = 'einstellungen')}>{i18n.t('psub.settings')}</button>
</div>

{#if sub === 'profil'}<Profile />
{:else if sub === 'fortschritt'}<Progress />
{:else if sub === 'shop'}<AvatarShop />
{:else if sub === 'nachrichten'}<Messages />
{:else if sub === 'freunde'}<Friends />
{:else if sub === 'export'}<Export />
{:else}<Settings />{/if}

<style>
  .subnav { display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
  .subnav::-webkit-scrollbar { display: none; }
  .subnav button { flex: 0 0 auto; padding: 8px 15px; border-radius: 999px; border: 1px solid var(--border, #272e3b); background: var(--surface, #14181f); color: var(--muted, #95a1b4); cursor: pointer; font-size: 0.88rem; font-weight: 600; white-space: nowrap; box-shadow: none; transition: var(--trans, 0.16s ease); }
  .subnav button:hover { color: var(--text, #eaedf3); border-color: var(--border-strong, #38414f); transform: none; }
  .subnav button.active { background: var(--accent, #6e7cff); color: var(--on-accent, #fff); border-color: transparent; }
</style>
