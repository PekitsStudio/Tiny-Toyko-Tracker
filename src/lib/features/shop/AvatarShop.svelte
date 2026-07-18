<script lang="ts">
  import { onMount } from 'svelte';
  import { getShop, buyAvatar, equipAvatar, RARITY_META, type ShopData, type ShopAvatar } from '$lib/services/avatars.service';

  let data = $state<ShopData | null>(null);
  let loading = $state(true);
  let msg = $state('');
  let busy = $state<string | null>(null); // path, das gerade verarbeitet wird
  let setFilter = $state('all'); // 'all' | 'owned' | '<colKey>/<setKey>'

  // Alle Sets (ueber alle Kollektionen) fuer die Filter-Chips.
  const allSets = $derived.by(() => {
    const out: { id: string; label: string }[] = [];
    if (data) for (const c of data.collections) for (const s of c.sets) out.push({ id: `${c.key}/${s.key}`, label: s.label });
    return out;
  });
  const showSet = (colKey: string, setKey: string) => setFilter === 'all' || setFilter === 'owned' || setFilter === `${colKey}/${setKey}`;
  const visAvatars = (avs: ShopAvatar[]) => (setFilter === 'owned' ? avs.filter((a) => a.owned) : avs);

  async function load() {
    loading = true; msg = '';
    try { data = await getShop(); }
    catch (e) {
      const m = (e as Error).message;
      msg = m === 'Nicht eingeloggt' ? 'Bitte zuerst oben anmelden.' : m;
    } finally { loading = false; }
  }
  onMount(load);

  const rarLabel = (r: string) => RARITY_META[r]?.label ?? r;

  async function buy(a: ShopAvatar) {
    if (!data || busy) return;
    busy = a.path; msg = '';
    try {
      const cp = await buyAvatar(a.path, a.price);
      data.cp = cp;
      a.owned = true;
      msg = `„${a.name}" freigeschaltet ✓`;
      setTimeout(() => (msg = ''), 3000);
    } catch (e) { msg = (e as Error).message; }
    finally { busy = null; }
  }

  async function equip(a: ShopAvatar) {
    if (!data || busy) return;
    busy = a.path; msg = '';
    try {
      await equipAvatar(a.url);
      // alle deaktivieren, gewaehlten aktivieren
      for (const c of data.collections) for (const s of c.sets) for (const av of s.avatars) av.active = av.path === a.path;
      data.avatarUrl = a.url;
      msg = `„${a.name}" als Profilbild gesetzt ✓`;
      setTimeout(() => (msg = ''), 3000);
    } catch (e) { msg = (e as Error).message; }
    finally { busy = null; }
  }
</script>

<div class="shop">
  <div class="head">
    <div>
      <h2>Avatar-Shop</h2>
      <p class="sub">Schalte Avatare mit Collector Points frei und setze sie als Profilbild.</p>
    </div>
    {#if data}<div class="cp">🪙 {data.cp.toLocaleString('de-DE')} <span>CP</span></div>{/if}
  </div>

  {#if msg}<div class="msg">{msg}</div>{/if}

  {#if !loading && data && data.collections.length > 0}
    <div class="filters">
      <button class:on={setFilter === 'all'} onclick={() => (setFilter = 'all')}>Alle</button>
      <button class:on={setFilter === 'owned'} onclick={() => (setFilter = 'owned')}>Meine</button>
      {#each allSets as s (s.id)}
        <button class:on={setFilter === s.id} onclick={() => (setFilter = s.id)}>{s.label}</button>
      {/each}
    </div>
  {/if}

  {#if loading}
    <div class="hint">Lädt…</div>
  {:else if !data || data.collections.length === 0}
    <div class="hint">Noch keine Avatare verfügbar.</div>
  {:else}
    {#each data.collections as col (col.key)}
      {#if data.collections.length > 1 && setFilter !== 'owned' && col.sets.some((s) => showSet(col.key, s.key))}<h3 class="coll">{col.label}</h3>{/if}
      {#each col.sets as set (set.key)}
        {#if showSet(col.key, set.key) && visAvatars(set.avatars).length > 0}
        <section class="set">
          <div class="set-head"><span class="dot"></span>{set.label}</div>
          <div class="grid">
            {#each visAvatars(set.avatars) as a (a.path)}
              <div class="card rar-{a.rarity}" class:active={a.active}>
                <div class="imgwrap">
                  <img src={a.url} alt={a.name} loading="lazy" />
                  {#if a.active}<span class="badge-active">Aktiv</span>{/if}
                </div>
                <div class="name">{a.name}</div>
                <div class="rar">{rarLabel(a.rarity)}</div>
                {#if a.active}
                  <button class="btn on" disabled>✓ Ausgerüstet</button>
                {:else if a.owned}
                  <button class="btn equip" onclick={() => equip(a)} disabled={busy === a.path}>
                    {busy === a.path ? '…' : 'Auswählen'}
                  </button>
                {:else}
                  <button class="btn buy" onclick={() => buy(a)} disabled={busy === a.path || (data?.cp ?? 0) < a.price}>
                    {busy === a.path ? '…' : `🪙 ${a.price.toLocaleString('de-DE')}`}
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        </section>
        {/if}
      {/each}
    {/each}

    {#if setFilter === 'owned' && data.owned.length === 0}
      <div class="hint">Du hast noch keine Avatare freigeschaltet.</div>
    {/if}
  {/if}
</div>

<style>
  .shop { display: flex; flex-direction: column; gap: 18px; }
  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  h2 { margin: 4px 0 2px; }
  .sub { margin: 0; color: var(--muted, #95a1b4); font-size: 0.86rem; }
  .cp {
    display: inline-flex; align-items: baseline; gap: 5px; padding: 8px 14px; border-radius: 999px;
    background: color-mix(in srgb, var(--gold, #f2b85a) 16%, var(--surface, #14181f));
    border: 1px solid color-mix(in srgb, var(--gold, #f2b85a) 45%, transparent);
    color: var(--gold, #f2b85a); font-weight: 800; font-size: 1.05rem; white-space: nowrap;
  }
  .cp span { font-size: 0.72rem; font-weight: 700; opacity: 0.8; }
  .msg { padding: 9px 13px; border-radius: 10px; background: color-mix(in srgb, var(--pos, #37d399) 14%, transparent); color: var(--pos, #86efac); font-size: 0.86rem; font-weight: 600; }
  .hint { color: var(--muted, #95a1b4); padding: 20px 0; }

  .filters { display: flex; gap: 7px; flex-wrap: wrap; }
  .filters button {
    padding: 6px 13px; border-radius: 999px; border: 1px solid var(--border, #272e3b);
    background: var(--surface, #14181f); color: var(--muted, #95a1b4); cursor: pointer;
    font-size: 0.82rem; font-weight: 600; white-space: nowrap; transition: var(--trans, 0.16s ease);
  }
  .filters button:hover { color: var(--text, #eaedf3); border-color: var(--border-strong, #38414f); }
  .filters button.on { background: var(--accent, #6e7cff); color: var(--on-accent, #fff); border-color: transparent; }

  .coll { margin: 6px 0 0; font-size: 1.1rem; }
  .set { display: flex; flex-direction: column; gap: 10px; }
  .set-head { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.98rem; color: var(--text, #eaedf3); }
  .set-head .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent, #6e7cff); }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }

  .card {
    display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;
    padding: 14px 12px 12px; border-radius: 14px; background: var(--surface, #14181f);
    border: 1px solid var(--border, #272e3b); transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
  }
  .card:hover { transform: translateY(-3px); }
  .card.active { border-color: var(--accent, #6e7cff); box-shadow: 0 0 0 1px var(--accent, #6e7cff); }

  .imgwrap { position: relative; }
  .card img { width: 84px; height: 84px; border-radius: 50%; object-fit: cover; background: #0b0d13; border: 3px solid var(--border-strong, #38414f); }
  .badge-active { position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); background: var(--accent, #6e7cff); color: #fff; font-size: 0.62rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }

  .name { font-weight: 700; font-size: 0.9rem; line-height: 1.15; }
  .rar { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.85; }

  .btn { margin-top: 4px; width: 100%; padding: 8px 10px; border-radius: 9px; border: 0; font-weight: 700; font-size: 0.84rem; cursor: pointer; transition: filter 0.14s ease; }
  .btn:hover:not(:disabled) { filter: brightness(1.08); }
  .btn:disabled { cursor: default; }
  .btn.buy { background: color-mix(in srgb, var(--gold, #f2b85a) 20%, var(--surface-2, #1b202b)); color: var(--gold, #f2b85a); border: 1px solid color-mix(in srgb, var(--gold, #f2b85a) 40%, transparent); }
  .btn.buy:disabled { opacity: 0.45; }
  .btn.equip { background: var(--accent, #6e7cff); color: var(--on-accent, #fff); }
  .btn.on { background: transparent; color: var(--pos, #86efac); border: 1px solid color-mix(in srgb, var(--pos, #37d399) 40%, transparent); }

  /* Seltenheits-Rahmen um das Bild */
  .rar-bronze img { border-color: #c9803e; }
  .rar-silber img, .rar-silver img { border-color: #b9c2cf; }
  .rar-gold img { border-color: var(--gold, #f2b85a); }
  .rar-diamant img, .rar-diamond img { border-color: #6fd3e6; box-shadow: 0 0 10px color-mix(in srgb, #6fd3e6 55%, transparent); }
  .rar-legend img, .rar-legendary img { border-color: #b98cff; box-shadow: 0 0 12px color-mix(in srgb, #b98cff 60%, transparent); }
  .rar-diamant .rar, .rar-diamond .rar { color: #6fd3e6; }
  .rar-legend .rar, .rar-legendary .rar { color: #b98cff; }
  .rar-gold .rar { color: var(--gold, #f2b85a); }

  @media (max-width: 640px) {
    .grid { grid-template-columns: repeat(auto-fill, minmax(108px, 1fr)); gap: 10px; }
    .card img { width: 68px; height: 68px; }
  }
</style>
