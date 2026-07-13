<script lang="ts">
  // Rendert eine Landesflagge aus einem 2-Buchstaben-Laendercode (z. B. "DE").
  // Als Bild (flagcdn), weil Windows Flaggen-Emoji nur als Buchstaben zeigt.
  let { country }: { country?: string | null } = $props();
  const cc = $derived(country && /^[A-Za-z]{2}$/.test(country.trim()) ? country.trim().toLowerCase() : null);
</script>

{#if cc}
  <img
    class="cflag"
    src={`https://flagcdn.com/16x12/${cc}.png`}
    srcset={`https://flagcdn.com/32x24/${cc}.png 2x`}
    alt={country ?? ''}
    title={(country ?? '').toUpperCase()}
  />
{/if}

<style>
  .cflag {
    display: inline-block;
    width: 16px;
    height: 12px;
    aspect-ratio: auto;
    object-fit: cover;
    background: none;
    vertical-align: middle;
    margin-right: 5px;
    border-radius: 2px;
  }
</style>
