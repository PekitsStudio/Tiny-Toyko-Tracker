<script lang="ts">
  import { profileView } from '$lib/stores/profileview.svelte';
  import { getPublicProfile, getUserFeedback, getAvatar, type PublicProfile, type FeedbackEntry } from '$lib/services/profile.service';
  import { listRatings, rateUser, deleteRating, type UserRating } from '$lib/services/ratings.service';
  import { levelFromXp } from '$lib/services/gamification.service';
  import { listMarketBySeller, type MarketCard } from '$lib/services/market.service';
  import { fmt } from '$lib/format';
  import { detail } from '$lib/stores/detail.svelte';
  import { nav } from '$lib/stores/nav.svelte';
  import { social } from '$lib/stores/social.svelte';
  import { sendFriendRequest } from '$lib/services/social.service';
  import { auth } from '$lib/stores/auth.svelte';

  let prof = $state<PublicProfile | null>(null);
  let offers = $state<MarketCard[]>([]);
  let fbs = $state<FeedbackEntry[]>([]);
  let ratings = $state<UserRating[]>([]);
  let avatarUrl = $state<string | null>(null);
  let loading = $state(false); let err = $state(''); let friendMsg = $state('');

  // Eigene Bewertung des angezeigten Nutzers (Formular).
  let myStars = $state(0); let myComment = $state(''); let rateBusy = $state(false); let rateMsg = $state('');

  const myRating = $derived(ratings.find((r) => r.is_mine) ?? null);

  $effect(() => {
    const id = profileView.userId;
    if (!id) { prof = null; offers = []; fbs = []; ratings = []; avatarUrl = null; err = ''; return; }
    loading = true; err = ''; prof = null; offers = []; fbs = []; ratings = []; avatarUrl = null;
    myStars = 0; myComment = ''; rateMsg = '';
    (async () => {
      try {
        prof = await getPublicProfile(id);
        try { avatarUrl = await getAvatar(id); } catch { avatarUrl = null; }
        try { offers = await listMarketBySeller(id); } catch { offers = []; }
        try { fbs = await getUserFeedback(id); } catch { fbs = []; }
        try {
          ratings = await listRatings(id);
          const mine = ratings.find((r) => r.is_mine);
          if (mine) { myStars = mine.stars; myComment = mine.comment ?? ''; }
        } catch { ratings = []; }
      } catch (e) { err = (e as Error).message; }
      finally { loading = false; }
    })();
  });

  async function reloadRatings() {
    if (!prof) return;
    try { ratings = await listRatings(prof.user_id); prof = await getPublicProfile(prof.user_id); } catch { /* egal */ }
  }
  async function submitRating() {
    if (!prof || myStars < 1) return;
    rateBusy = true; rateMsg = '';
    try { await rateUser(prof.user_id, myStars, myComment); rateMsg = 'Bewertung gespeichert ✓'; await reloadRatings(); }
    catch (e) { rateMsg = (e as Error).message; } finally { rateBusy = false; }
  }
  async function removeRating() {
    if (!prof) return;
    rateBusy = true; rateMsg = '';
    try { await deleteRating(prof.user_id); myStars = 0; myComment = ''; rateMsg = 'Bewertung entfernt.'; await reloadRatings(); }
    catch (e) { rateMsg = (e as Error).message; } finally { rateBusy = false; }
  }

  function close() { profileView.close(); }
  function onkey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
  function since(iso: string | null): string { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('de-DE'); } catch { return ''; } }
  function stars(n: number): string { return '★★★★★'.slice(0, Math.max(0, Math.min(5, Math.round(n)))); }
  function openOffer(m: MarketCard) { detail.open({ game: m.game, name: m.name, imageUrl: m.image_url, setName: m.set_name, number: m.number, rarity: m.rarity, lang: m.language, price: m.asking_price, currency: m.currency, cardmarketUrl: m.cardmarket_url, condition: m.condition }); }
  function msgUser() { if (!prof) return; social.openChat(prof.user_id, prof.name ?? 'Sammler'); nav.go('profil'); profileView.close(); }
  async function addFriend() { if (!prof) return; friendMsg = ''; try { await sendFriendRequest(prof.user_id); friendMsg = 'Freundschaftsanfrage gesendet.'; } catch (e) { friendMsg = (e as Error).message; } }
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
          <div class="pf-top">
            {#if avatarUrl}<img class="pf-av" src={avatarUrl} alt="" />{:else}<div class="pf-av avph">{(prof.name ?? 'S').slice(0, 1).toUpperCase()}</div>{/if}
            <h2>{prof.name ?? 'Sammler'}</h2>
          </div>
          <div class="sub">{#if prof.country}{prof.country} · {/if}Mitglied seit {since(prof.member_since)}</div>
          <div class="stats">
            <span class="stat lvl">⭐ Level {levelFromXp(prof.points ?? 0).level}</span>
            {#if prof.rank != null}<span class="stat">Rang #{prof.rank}</span>{/if}
            {#if prof.points != null}<span class="stat">{prof.points} Punkte</span>{/if}
            {#if prof.fb_count != null && prof.fb_count > 0}
              <span class="stat">★ {prof.fb_avg ?? '–'} ({prof.fb_count})</span>
              {#if prof.fb_recommend_pct != null}<span class="stat">{prof.fb_recommend_pct}% Weiterempfehlung</span>{/if}
            {/if}
            {#if prof.rating_count != null && prof.rating_count > 0}<span class="stat">Sammler-Bewertung ★ {prof.rating_avg ?? '–'} ({prof.rating_count})</span>{/if}
            {#if prof.total_cards != null}<span class="stat">{prof.total_cards} Karten</span>{/if}
            {#if prof.sold_count != null && prof.sold_count > 0}<span class="stat">{prof.sold_count} verkauft</span>{/if}
          </div>
          {#if prof.fav_games || prof.collector_type}<div class="meta2">{[prof.collector_type, prof.fav_games].filter(Boolean).join(' · ')}</div>{/if}
          {#if prof.bio}<p class="bio">{prof.bio}</p>{/if}
          {#if prof.contact}<div class="contact">Kontakt: {prof.contact}</div>{/if}
          {#if prof.user_id !== auth.user?.id}<div class="pactions"><button class="primary" onclick={msgUser}>Nachricht schreiben</button><button class="ghost" onclick={addFriend}>+ Freund</button>{#if friendMsg}<span class="fmsg">{friendMsg}</span>{/if}</div>{/if}
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
          <h3 class="oh">Trade-Feedback</h3>
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

        <h3 class="oh">Sammler-Bewertungen</h3>
        {#if prof.user_id !== auth.user?.id}
          <div class="rateform">
            <div class="ratehead">
              <span class="ratelbl">{myRating ? 'Deine Bewertung' : 'Diesen Sammler bewerten'}</span>
              <span class="starpick">
                {#each [1, 2, 3, 4, 5] as n}
                  <button type="button" class="starbtn" class:on={n <= myStars} onclick={() => (myStars = n)} aria-label={`${n} Sterne`}>★</button>
                {/each}
              </span>
            </div>
            <textarea rows="2" placeholder="Kommentar (optional)" bind:value={myComment}></textarea>
            <div class="raterow">
              <button class="primary" onclick={submitRating} disabled={rateBusy || myStars < 1}>{myRating ? 'Aktualisieren' : 'Bewerten'}</button>
              {#if myRating}<button class="ghost" onclick={removeRating} disabled={rateBusy}>Löschen</button>{/if}
              {#if rateMsg}<span class="fmsg">{rateMsg}</span>{/if}
            </div>
          </div>
        {/if}
        {#if ratings.length}
          <div class="fblist">
            {#each ratings as r (r.rater)}
              <div class="fb">
                <div class="fbhead">
                  <span class="fbstars">{stars(r.stars)}</span>
                  <span class="fbwho">{r.rater_name ?? 'Sammler'}{#if r.is_mine} · du{/if}</span>
                </div>
                {#if r.comment}<div class="fbcomment">„{r.comment}"</div>{/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="pad muted">Noch keine Sammler-Bewertungen.</div>
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
  .phead h2 { margin: 0; }
  .pf-top { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
  .pf-av { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; background: #12151d; border: 2px solid var(--border, #2a2f3a); flex-shrink: 0; }
  .avph { display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.5rem; color: var(--accent, #6e7cff); }
  .sub { color: var(--muted); font-size: 0.9rem; }
  .stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
  .stat { background: #12151d; border: 1px solid #2a2f3a; border-radius: 999px; padding: 4px 12px; font-size: 0.8rem; }
  .meta2 { color: var(--muted); font-size: 0.85rem; }
  .bio { margin: 10px 0; } .contact { color: var(--accent, #6366f1); font-size: 0.85rem; }
  .pactions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
  .pactions .primary { padding: 8px 14px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
  .pactions .ghost { padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: inherit; cursor: pointer; }
  .fmsg { color: #86efac; font-size: 0.82rem; }
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
  .rateform { background: #12151d; border: 1px solid #2a2f3a; border-radius: 10px; padding: 12px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
  .ratehead { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .ratelbl { color: var(--muted); font-size: 0.85rem; }
  .starpick { display: inline-flex; gap: 2px; }
  .starbtn { background: none; border: 0; padding: 0 1px; font-size: 1.35rem; line-height: 1; color: #3a3f4a; cursor: pointer; }
  .starbtn.on { color: #f5c451; }
  .rateform textarea { padding: 7px 10px; border-radius: 8px; border: 1px solid #2a2f3a; background: #171a23; color: inherit; font: inherit; resize: vertical; }
  .raterow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .raterow .primary { padding: 7px 14px; border-radius: 8px; border: 0; background: var(--accent, #6366f1); color: #fff; font-weight: 600; cursor: pointer; }
  .raterow .ghost { padding: 7px 12px; border-radius: 8px; border: 1px solid #2a2f3a; background: transparent; color: #fca5a5; cursor: pointer; }

  @media (max-width: 560px) {
    .ov { padding: 0; align-items: flex-end; }
    .dlg { max-width: 100%; max-height: 94vh; border-radius: 16px 16px 0 0; border-bottom: 0; padding: 18px 16px; }
    .phead h2 { font-size: 1.25rem; }
    .ogrid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
    .pactions { width: 100%; }
    .pactions .primary, .pactions .ghost { flex: 1 1 auto; }
  }
</style>
