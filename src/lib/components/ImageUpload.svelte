<script lang="ts">
  import { uploadImage } from '$lib/services/upload.service';

  let {
    value = $bindable(''),
    folder = 'misc',
    round = false
  }: { value?: string; folder?: string; round?: boolean } = $props();

  let busy = $state(false);
  let err = $state('');
  let fileInput: HTMLInputElement | undefined;

  async function onPick(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    busy = true; err = '';
    try { value = await uploadImage(f, folder); }
    catch (ex) { const m = (ex as Error).message; err = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { busy = false; if (fileInput) fileInput.value = ''; }
  }
</script>

<div class="imgup">
  {#if value}
    <img class="preview" class:round src={value} alt="Vorschau" />
  {:else}
    <div class="ph" class:round>🖼️</div>
  {/if}
  <div class="col">
    <div class="btns">
      <input bind:this={fileInput} type="file" accept="image/*" onchange={onPick} hidden />
      <button type="button" class="up" onclick={() => fileInput?.click()} disabled={busy}>
        {busy ? 'Lädt…' : value ? 'Bild ersetzen' : '📷 Bild hochladen'}
      </button>
      {#if value}<button type="button" class="clr" onclick={() => (value = '')} disabled={busy}>Entfernen</button>{/if}
    </div>
    <input class="url" type="text" placeholder="oder Bild-URL einfügen" bind:value />
    {#if err}<span class="err">{err}</span>{/if}
  </div>
</div>

<style>
  .imgup { display: flex; gap: 12px; align-items: flex-start; }
  .preview, .ph { width: 72px; height: 72px; border-radius: 10px; object-fit: cover; background: #12151d; border: 1px solid var(--border, #2a2f3a); flex-shrink: 0; }
  .ph { display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: var(--muted, #9aa0ad); }
  .preview.round, .ph.round { border-radius: 50%; }
  .col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .btns { display: flex; gap: 8px; flex-wrap: wrap; }
  .up { padding: 8px 12px; border-radius: 8px; border: 0; background: var(--accent, #6e7cff); color: var(--on-accent, #fff); font-weight: 600; cursor: pointer; }
  .up:disabled { opacity: 0.6; cursor: default; }
  .clr { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border, #2a2f3a); background: transparent; color: #fca5a5; cursor: pointer; }
  .url { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border, #2a2f3a); background: #12151d; color: inherit; font: inherit; font-size: 0.85rem; }
  .err { color: #fca5a5; font-size: 0.8rem; }
</style>
