<script lang="ts">
  import { marketView } from '$lib/stores/marketview.svelte';
  import { createTrade } from '$lib/services/trade.service';
  import { profileView } from '$lib/stores/profileview.svelte';
  import { social } from '$lib/stores/social.svelte';
  import { nav } from '$lib/stores/nav.svelte';
  import { fmt, GAME_LABEL } from '$lib/format';
  import Flag from './Flag.svelte';
  import CountryFlag from './CountryFlag.svelte';

  const c = $derived(marketView.card);
  let buying = $state(false); let msg = $state(''); let sent = $state(false);

  function close() { marketView.close(); }
  function onkey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }

  const cur = $derived(c?.currency ?? 'EUR');
  const priceMain = $derived(!c ? '' : (c.asking_price != null ? fmt(c.asking_price, cur) : (c.price_current != null ? fmt(c.price_current, cur) : 'Preis auf Anfrage')));
  const priceSub = $derived(!c ? '' : (c.asking_price != null && c.price_current != null ? `Marktwert ${fmt(c.price_current, cur)}` : (c.asking_price == null && c.price_current != null ? 'Richtwert – kein Festpreis' : '')));
  const rating = $derived(!c ? '' : (c.seller_fb_count ? `★ ${Number(c.seller_fb_avg ?? 0).toFixed(2)} · ${c.seller_fb_count} Feedback` : (c.seller_rating != null ? `★ ${Number(c.seller_rating).toFixed(1)} · ${c.seller_rating_count ?? 0} Bewertungen` : 'Noch keine Bewertung')));

  async function buy() {
    if (!c || c.is_mine) return;
    buying = true; msg = '';
    try {
      await createTrade({ responder: c.seller_id, cardId: c.id, cardName: c.name, cardGame: c.game, price: c.asking_price, currency: c.currency });
      sent = true; msg = 'Kaufanfrage gesendet – verfolge sie unter Marktplatz → Handel.';
    } catch (e) { msg = (e as Error).message; } finally { buying = false; }
  }
  function messageSeller() { if (!c) return; social.openChat(c.seller_id, c.seller_name ?? 'Sammler'); close(); nav.go('profil'); }
  function openSeller() { if (!c) return; const id = c.seller_id; close(); profileView.open(id); }
</script>

<svelte:window onkeydown={onkey} />

{#if c}
  <div class="ov" onclick={close} role="presentation">
    <div class="dlg" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
      <button class="x" onclick={close} aria-label="Schließen">✕</button>
      <div class="left">
        {#if c.image_url}<img src={c.image_url} alt={c.name} />{:else}<div class="ph">🃏</div>{/if}
      </div>
      <div class="right">
        <span class="tag {c.game}">{GAME_LABEL[c.game] ?? c.game}</span>
        <h3>{c.name}</h3>
        <div class="sub"><Flag lang={c.language} />{c.set_name ?? ''}{#if c.number} · {c.number}{/if}{#if c.language} · {c.language.toUpperCase()}{/if}</div>

        <div class="attrs">
          <span class="attr">Zustand <b>{c.condition ?? '–'}</b></span>
          {#if c.rarity}<span class="attr">Seltenheit <b>{c.rarity}</b></span>{/if}
          <span class="attr">Menge <b>{c.quantity ?? 1}</b></span>
        </div>

        <div class="buy">
          <div class="price">{priceMain}</div>
          {#if priceSub}<div class="psub">{priceSub}</div>{/if}

          <button class="sellercard" onclick={openSeller}>
            <div class="scname"><CountryFlag country={c.seller_country} /><b>{c.seller_name ?? 'Sammler'}</b>{#if c.seller_verified} 🛡️{/if}</div>
            <div class="scmeta">{rating}</div>
            {#if c.seller_contact}<div class="scmeta">Kontakt: {c.seller_contact}</div>{/if}
          </button>

          {#if !c.is_mine && c.seller_id}
            <button class="primary" onclick={buy} disabled={buying || sent}>{buying ? '…' : (sent ? 'Anfrage gesendet ✓' : '🔄 Kauf / Tausch anfragen')}</button>
            <button class="ghost" onclick={messageSeller}>✉ Nachricht an Verkäufer</button>
          {:else}
            <div class="own">Das ist dein eigenes Angebot.</div>
          {/if}
          {#if msg}<div class="msg" class:err={!sent}>{msg}</div>{/if}
          {#if c.cardmarket_url}<a class="cmlink" href={c.cardmarket_url} target="_blank" rel="noopener">Auf Cardmarket vergleichen ↗</a>{/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .ov { position: fixed; inset: 0; background: rgba(6,8,14,0.66); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
  .dlg { position: relative; display: grid; grid-template-columns: 1fr 340px; width: 100%; max-width: 880px; max-height: 92vh; background: var(--surface, #14181f); border: 1px solid var(--border, #232833); border-radius: 18px; overflow: hidden; box-shadow: var(--shadow-lg, 0 24px 60px -18px rgba(0,0,0,.65)); }
  .x { position: absolute; top: 12px; right: 14px; z-index: 3; width: 34px; height: 34px; border-radius: 999px; border: 1px solid var(--border, #2a2f3a); background: rgba(0,0,0,0.35); color: var(--muted, #9aa0ad); cursor: pointer; }
  .x:hover { color: var(--text, #e7e9ee); }

  .left { background: #0a0c10; display: flex; align-items: center; justify-content: center; padding: 26px; }
  .left img { width: 100%; max-width: 320px; aspect-ratio: 5/7; object-fit: contain; border-radius: 12px; box-shadow: var(--shadow, 0 8px 24px -10px rgba(0,0,0,.55)); }
  .ph { width: 100%; max-width: 320px; aspect-ratio: 5/7; display: flex; align-items: center; justify-content: center; font-size: 3rem; background: #12151d; border-radius: 12px; }

  .right { padding: 24px 22px; overflow-y: auto; -webkit-overflow-scrolling: touch; display: flex; flex-direction: column; gap: 8px; }
  .tag { position: static; display: inline-block; align-self: flex-start; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 9px; border-radius: 999px; color: #15110a; background: var(--gold, #f5c451); }
  .tag.pokemon { background: var(--pokemon, #ffcb05); } .tag.magic { background: var(--magic, #7f9cf5); color: #fff; }
  .tag.yugioh { background: var(--yugioh, #c07be0); color: #fff; } .tag.onepiece { background: var(--onepiece, #f2566e); color: #fff; }
  .right h3 { margin: 10px 0 2px; font-size: 1.4rem; }
  .sub { display: flex; align-items: center; color: var(--muted, #9aa0ad); font-size: 0.86rem; }

  .attrs { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 6px; }
  .attr { background: var(--surface-2, #1b202b); border: 1px solid var(--border, #2a2f3a); border-radius: 999px; padding: 6px 12px; font-size: 0.78rem; color: var(--muted, #9aa0ad); }
  .attr b { color: var(--text, #e7e9ee); }

  .buy { margin-top: auto; background: var(--surface-2, #1b202b); border: 1px solid var(--border, #232833); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .price { font-family: 'Space Grotesk', sans-serif; font-size: 1.9rem; font-weight: 800; color: var(--gold, #f5c451); line-height: 1.1; font-variant-numeric: tabular-nums; }
  .psub { color: var(--muted, #9aa0ad); font-size: 0.82rem; margin-top: -6px; }

  .sellercard { text-align: left; background: var(--surface, #14181f); border: 1px solid var(--border, #2a2f3a); border-radius: 10px; padding: 11px 12px; cursor: pointer; color: inherit; }
  .sellercard:hover { border-color: var(--accent, #6e7cff); }
  .scname { display: flex; align-items: center; font-size: 0.92rem; }
  .scmeta { color: var(--muted, #9aa0ad); font-size: 0.78rem; margin-top: 3px; }

  .primary { padding: 12px 16px; border-radius: 10px; border: 0; background: var(--accent, #6e7cff); color: var(--on-accent, #fff); font-weight: 700; cursor: pointer; }
  .primary:disabled { opacity: 0.65; cursor: default; }
  .ghost { padding: 11px 16px; border-radius: 10px; border: 1px solid var(--border-strong, #38414f); background: transparent; color: inherit; font-weight: 600; cursor: pointer; }
  .ghost:hover { border-color: var(--accent, #6e7cff); color: var(--accent, #6e7cff); }
  .own { color: var(--muted, #9aa0ad); font-size: 0.85rem; }
  .msg { font-size: 0.82rem; color: var(--pos, #86efac); } .msg.err { color: #fca5a5; }
  .cmlink { color: var(--accent, #6e7cff); font-size: 0.82rem; text-decoration: none; }
  .cmlink:hover { text-decoration: underline; }

  @media (max-width: 640px) {
    .ov { padding: 0; align-items: flex-end; }
    .dlg { grid-template-columns: 1fr; max-width: 100%; max-height: 94vh; border-radius: 16px 16px 0 0; overflow-y: auto; }
    .left { padding: 18px; }
    .left img, .ph { max-width: 220px; }
    .right { padding: 18px 16px 22px; }
  }
</style>
