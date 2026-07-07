<script lang="ts">
  import { flagFor } from '$lib/format';
  import type { PokeHit } from '$lib/services/search.service';

  let { open = false, kind = 'poke', pokeHits = [], opHits = [], onpick }:
    {
      open?: boolean; kind?: 'poke' | 'op';
      pokeHits?: PokeHit[]; opHits?: string[];
      onpick?: (name: string, lang: string) => void;
    } = $props();
</script>

{#if open}
  <div class="ac-list open">
    {#if kind === 'poke'}
      {#if pokeHits.length === 0}
        <div class="ac-empty">Kein Pokémon gefunden.</div>
      {:else}
        {#each pokeHits as h}
          <div class="ac-row">
            <div class="ac-label">{h.enName} — Sprache zum Suchen wählen:</div>
            <div class="ac-chips">
              {#each h.chips as ch}
                <button type="button" class="ac-chip" onclick={() => onpick?.(ch.name, ch.lang)}>
                  <span class="fl">{flagFor(ch.lang) || ch.lang.toUpperCase()}</span>{ch.name}
                </button>
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    {:else}
      {#if opHits.length === 0}
        <div class="ac-empty">Keine Karte gefunden.</div>
      {:else}
        {#each opHits as n}
          <button type="button" class="ac-simple" onclick={() => onpick?.(n, 'en')}>{n}</button>
        {/each}
      {/if}
    {/if}
  </div>
{/if}
