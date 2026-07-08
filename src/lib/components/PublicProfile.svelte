<script lang="ts">
  import { profileView } from '$lib/stores/profileview.svelte';
  import { getPublicProfile, getUserFeedback, type PublicProfile, type FeedbackEntry } from '$lib/services/profile.service';
  import { listMarketBySeller, type MarketCard } from '$lib/services/market.service';
  import { fmt } from '$lib/format';
  import { detail } from '$lib/stores/detail.svelte';

  let prof = $state<PublicProfile | null>(null);
  let offers = $state<MarketCard[]>([]);
  let fbs = $state<FeedbackEntry[]>([]);
  let loading = $state(false); let err = $state('');

  $effect(() => {
    const id = profileView.userId;
    if (!id) { prof = null; offers = []; fbs = []; err = ''; return; }
    loading = true; err = ''; prof = null; offers = []; fbs = [];
    (async () => {
      try {
        prof = await getPublicProfile(id);
        try { offers = await listMarketBySeller(id); } catch { offers = []; }
        try { fbs = await getUserFeedback(id); } catch { fbs = []; }
      } catch (e) { err = (e as Error).message; }
      finally { loading = false; }
    })();
  });

  function close() { profileView.close(); }
  function onkey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
  function since(iso: string | null): string { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('de-DE'); } catch { return ''; } }
  function stars(n: number): string { return '★★★★★'.slice(0, Math.max(0, Math.min(5, Math.round(n)))); }
  function openOffer(m: MarketCard) { detail.open({ game: m.game, name: m.name, imageUrl: m.image_url, setName: m.set_name, number: m.number, rarity: m.rarity, lang: m.language, price: m.asking_price, currency: m.currency, cardmarketUrl: m.cardmarket_url, condition: m.condition }); }
</script>

<svelte:window onkeydown={onkey} />

{#if profileView.userId}
  <div class="ov" onclick={close} role="presentation">
    <div class="dlg" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
      <button class="x" onclick={close} aria-label="Schließen">✕</button>
      {#if loading}<div class="pad">Lädt…</div>
      {:else if err}<div class="pad err">{err}</div>
      {:else if prof}
        <div class="phead">
          <h2>{prof.name ?? 'Sammler'}</h2>
          <div class="sub">{#if prof.country}{prof.country} · {/if}Mitglied seit {since(prof.member_since)}</div>
          <div class="stats">
            {#if prof.rank != null}<span class="stat">Rang #{prof.rank}</span>{/if}
            {#if prof.points != null}<span class="stat">{prof.points} Punkte</span>{/if}
            {#if prof.fb_count != null && prof.fb_count > 0}
              <span class="stat">★ {prof.fb_avg ?? '–'} ({prof.fb_count})</span>
              {#if prof.fb_recommend_pct != null}<span class="stat">{prof.fb_recommend_pct}% Weiterempfehlung</span>{/if}
            {/if}
            {#if prof.total_cards != null}<span class="stat">{prof.total_cards} Karten</span>{/if}
            {#if prof.sold_count != null && prof.sold_count > 0}<span class="stat">{prof.sold_count} verkauft</span>{/if}
          </div>
          {#if prof.fav_games || prof.collector_type}<div class="meta2">{[prof.collector_type, prof.fav_games].filter(Boolean).join(' · ')}</div>{/if}
          {#if prof.bio}<p class="bio">{prof.bio}</p>{/if}
          {#if prof.contact}<div class="contact">Kontakt: {prof.contact}</div>{/if}
        </div>

        <h3 class="oh">Angebote ({offers.length})</h3>
        {#if offers.length === 0}<div class="pad muted">Keine aktiven Angebote.</div>
        {:else}
          <div class="ogrid">
            {#each offers as m (m.id)}
              <button class="ocard" onclick={() => openOffer(m)}>
                {#if m.image_url}<img src={m.image_url} alt="" loading="lazy" />{:else}<div class="oph">?</div>{/if}
                <div class="on">{m.name}</div>
                <div class="op">{m.asking_price != null ? fmt(m.asking_price, m.currency ?? 'EUR') : 'VB'}</div>
              </button>
            {/each}
          </div>
        {/if}

        {#if fbs.length}
          <h3 class="oh">Bewertungen</h3>
          <div class="fblist">
            {#each fbs as f (f.trade_id + '-' + f.rater)}
              <div class="fb">
                <div class="fbhead">
                  <span class="fbstars">{stars(f.stars)}</span>
                  <span class="fbrec">{f.recommend ? '👍' : '👎'}</span>
                  <span class="fbwho">{f.rater_name ?? 'Sammler'}{#if f.card_name} · {f.card_name}{/if}</span>
                </div>
                {#if f.comment}<div class="fbcomment">„{f.comment}"</div>{/if}
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .ov { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 190; padding: 20px; }
  .dlg { position: relative; background: var(--surface, #171a23); border: 1px solid #2a2f3a; border-radius: 16px; max-width: 680px; width: 100%; max-height: 90vh; overflow: auto; padding: 22px; }
  .x { position: absolute; top: 10px; right: 10px; width: 34px; height: 34px; border-radius: 999px; border: 1px solid #2a2f3a; background: rgba(0,0,0,0.3); color: inherit; cursor: pointer; }
  .pad { padding: 16px 0; } .err { color: #fca5a5; } .muted { color: var(--muted, #9aa0ad); }
  .phead h2 { margin: 0 0 4px; }
  .sub { color: var(--muted); font-size: 0.9rem; }
  .stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
  .stat { background: #12151d; border: 1px solid #2a2f3a; border-radius: 999px; padding: 4px 12px; font-size: 0.8rem; }
  .meta2 { color: var(--muted); font-size: 0.85rem; }
  .bio { margin: 10px 0; } .contact { color: var(--accent, #6366f1); font-size: 0.85rem; }
  .oh { margin: 18px 0 10px; font-size: 1rem; }
  .ogrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; }
  .ocard { background: #12151d; border: 1px solid #2a2f3a; border-radius: 10px; padding: 8px; cursor: pointer; color: inherit; text-align: left; }
  .ocard img { width: 100%; aspect-ratio: 5/7; object-fit: contain; background: #0a0c10; border-radius: 6px; }
  .oph { aspect-ratio: 5/7; display: flex; align-items: center; justify-content: center; color: var(--muted); }
  .on { font-size: 0.75rem; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .op { color: var(--gold, #f5c451); font-weight: 700; font-size: 0.8rem; }
  .fblist { display: flex; flex-direction: column; gap: 10px; }
  .fb { background: #12151d; border: 1px solid #2a2f3a; border-radius: 10px; padding: 10px 12px; }
  .fbhead { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
  .fbstars { color: #f5c451; letter-spacing: 1px; }
  .fbwho { color: var(--muted); }
  .fbcomment { margin-top: 4px; font-size: 0.85rem; }
</style>
