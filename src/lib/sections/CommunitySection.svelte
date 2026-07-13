<script lang="ts">
  import Showcases from '$lib/features/showcase/Showcases.svelte';
  let sub = $state<'showcases'>('showcases');
</script>

<div class="subnav">
  <button class:active={sub === 'showcases'} onclick={() => (sub = 'showcases')}>Showcases</button>
</div>

{#if sub === 'showcases'}<Showcases only="entdecken" />{/if}

<style>
  .subnav { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
  .subnav button { padding: 7px 14px; border-radius: 8px; border: 1px solid #232833; background: transparent; color: var(--muted, #9aa0ad); cursor: pointer; font-size: 0.9rem; }
  .subnav button.active { background: #1c2130; color: var(--text, #e7e9ee); border-color: #2a2f3a; font-weight: 600; }
</style>
