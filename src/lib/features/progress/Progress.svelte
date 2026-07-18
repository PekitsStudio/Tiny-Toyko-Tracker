<script lang="ts">
  import { onMount } from 'svelte';
  import { getProgress, setCollectorPath, claimAchievement, COLLECTOR_PATHS, type Progress, type Achievement } from '$lib/services/gamification.service';
  import { getQuests, claimQuest, type QuestData, type Quest } from '$lib/services/quests.service';
  import { fmt } from '$lib/format';

  let p = $state<Progress | null>(null);
  let quests = $state<QuestData | null>(null);
  let cp = $state(0); let claimingId = $state('');
  let loading = $state(false); let status = $state(''); let path = $state(''); let pathBusy = $state(false);
  let sel = $state<Achievement | null>(null);

  async function load() {
    loading = true; status = '';
    try {
      p = await getProgress(); path = p.path ?? ''; cp = p.cp;
      try { quests = await getQuests(); cp = quests.cp; } catch { quests = null; }
    }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(load);

  async function savePath() {
    pathBusy = true;
    try { await setCollectorPath(path); if (p) p.path = path || null; }
    catch (e) { status = (e as Error).message; } finally { pathBusy = false; }
  }
  async function claim(quest: Quest) {
    claimingId = 'q:' + quest.id;
    try { cp = await claimQuest(quest); quest.claimed = true; }
    catch (e) { status = (e as Error).message; } finally { claimingId = ''; }
  }
  async function claimAch(a: Achievement) {
    claimingId = a.claimId;
    try { cp = await claimAchievement(a.claimId, a.cp); a.claimed = true; a.claimable = false; if (sel && sel.id === a.id) sel = { ...sel, claimed: true, claimable: false }; }
    catch (e) { status = (e as Error).message; } finally { claimingId = ''; }
  }
  function onkey(e: KeyboardEvent) { if (e.key === 'Escape') sel = null; }

  function lo(a: Achievement): number { return a.reached >= 0 ? a.tiers[a.reached] : 0; }
  function hi(a: Achievement): number { return a.nextThreshold ?? a.tiers[a.tiers.length - 1]; }
  function pctOf(a: Achievement): number { if (a.done) return 100; return Math.max(3, Math.min(100, ((a.value - lo(a)) / ((hi(a) - lo(a)) || 1)) * 100)); }
  function numFmt(a: Achievement, v: number): string { return a.money ? fmt(v) : String(Math.round(v)); }
  function valLabel(a: Achievement): string {
    if (a.done) return numFmt(a, a.value) + ' ✓';
    return a.nextThreshold != null ? `${numFmt(a, a.value)} / ${numFmt(a, a.nextThreshold)}` : numFmt(a, a.value);
  }

  const CAT_DESC: Record<string, string> = {
    Sammlung: 'Deine Karten', Wert: 'Portfolio-Wert', Verkäufer: 'Verkäufe', Handel: 'Trades',
    Community: 'Beiträge & Reaktionen', Social: 'Freunde', Preisjäger: 'Preisalarme', Streak: 'Aktivität', Selten: 'Besondere Erfolge'
  };

  const groups = $derived.by(() => {
    if (!p) return [] as [string, Achievement[]][];
    const m = new Map<string, Achievement[]>();
    for (const a of p.achievements) { const arr = m.get(a.cat) ?? []; arr.push(a); m.set(a.cat, arr); }
    return [...m.entries()];
  });

  // Naechstes Achievement: nicht-fertig, mit hoechstem Fortschritt zur naechsten Stufe.
  const nextAch = $derived.by(() => {
    if (!p) return null;
    const cand = p.achievements.filter((a) => a.nextThreshold != null && !a.done && a.value > 0);
    if (!cand.length) return p.achievements.find((a) => !a.done) ?? null;
    return cand.map((a) => ({ a, r: (a.value - lo(a)) / ((hi(a) - lo(a)) || 1) })).sort((x, y) => y.r - x.r)[0].a;
  });

  const activePath = $derived(COLLECTOR_PATHS.find((c) => c.key === (p?.path ?? '')));
</script>

<svelte:window onkeydown={onkey} />

<h2>Fortschritt</h2>
{#if status}<div class="hint">{status}</div>{/if}
{#if loading && !p}<div class="hint">Lädt…</div>{/if}

{#if p}
  <!-- 1) Wer bin ich: Level + Badges -->
  <section class="hero">
    <div class="ring">
      <div class="ringn"><span>Lv</span><b>{p.level}</b></div>
    </div>
    <div class="hmain">
      <div class="htop"><b>Level {p.level}</b><span class="muted">{p.into} / {p.need} XP</span></div>
      <div class="xpbar"><span class="xpfill" style="width:{Math.max(3, (p.into / p.need) * 100).toFixed(0)}%"></span></div>
      <div class="chips">
        <span class="chip cp">🪙 {cp} CP</span>
        <span class="chip fire">🔥 Streak {p.streak}{#if p.bestStreak > p.streak} · Best {p.bestStreak}{/if}</span>
        <span class="chip">🏅 {p.earned}/{p.total} Erfolge</span>
      </div>
    </div>
    {#if p.badges.length}
      <div class="bwrap">
        <div class="blabel">Aktive Badges</div>
        <div class="bbig">{#each p.badges.slice(0, 6) as b}<span class="bchip">{b}</span>{/each}</div>
      </div>
    {/if}
  </section>

  <!-- 2) Was heute/diese Woche -->
  {#snippet questRow(quest: Quest)}
    <div class="qrow" class:qd={quest.done}>
      <span class="qi">{quest.icon}</span>
      <div class="qmain">
        <div class="qt">{quest.text}</div>
        <div class="qbar"><span class="qfill" style="width:{Math.min(100, (quest.progress / quest.target) * 100).toFixed(0)}%"></span></div>
      </div>
      <div class="qnum">{Math.min(quest.progress, quest.target)}/{quest.target}</div>
      {#if quest.claimed}<span class="qtag ok">✓ +{quest.cp}</span>
      {:else if quest.done}<button class="qclaim" onclick={() => claim(quest)} disabled={claimingId === 'q:' + quest.id}>{claimingId === 'q:' + quest.id ? '…' : `+${quest.cp}`}</button>
      {:else}<span class="qtag">+{quest.cp}</span>{/if}
    </div>
  {/snippet}

  {#if quests}
    <div class="quests">
      <section class="qbox">
        <div class="qh"><h3>☀️ Heute</h3><span class="muted small">neu jeden Tag</span></div>
        {#each quests.daily as quest (quest.id)}{@render questRow(quest)}{/each}
      </section>
      <section class="qbox">
        <div class="qh"><h3>🗓️ Diese Woche</h3><span class="muted small">neu jeden Montag</span></div>
        {#each quests.weekly as quest (quest.id)}{@render questRow(quest)}{/each}
      </section>
    </div>
  {/if}

  <!-- 3) Nächstes großes Ziel -->
  {#if nextAch}
    <section class="next" onclick={() => (sel = nextAch)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') sel = nextAch; }}>
      <div class="nlabel">⭐ Nächstes Achievement</div>
      <div class="nrow">
        <div class="nic rar-{nextAch.rarity === 'locked' ? 'bronze' : nextAch.rarity}">{nextAch.icon}</div>
        <div class="nmain">
          <div class="nname">{nextAch.name}</div>
          <div class="ndesc muted">{nextAch.desc}</div>
          <div class="nbar"><span class="nfill" style="width:{pctOf(nextAch).toFixed(0)}%"></span></div>
        </div>
        <div class="nside">
          <div class="nval">{valLabel(nextAch)}</div>
          <div class="nrew">Belohnung +{nextAch.cp} CP</div>
        </div>
      </div>
    </section>
  {/if}

  <!-- Sammlerpfad als Karte -->
  <section class="pathcard">
    <div class="picon">{activePath?.icon ?? '🧭'}</div>
    <div class="pmain">
      <div class="ptitle">{activePath ? activePath.label : 'Kein Sammlerpfad gewählt'}</div>
      <div class="muted small">{activePath ? '⭐ Aktiver Pfad · Spezialquests & exklusive Titel (bald)' : 'Wähle einen Schwerpunkt für passende Titel & Quests.'}</div>
    </div>
    <div class="ppick">
      <select bind:value={path}>
        <option value="">— keiner —</option>
        {#each COLLECTOR_PATHS as c}<option value={c.key}>{c.icon} {c.label}</option>{/each}
      </select>
      <button class="save" onclick={savePath} disabled={pathBusy}>{pathBusy ? '…' : 'Wechseln'}</button>
    </div>
  </section>

  <!-- 4) Alle Achievements als Kapitel -->
  {#each groups as [cat, items] (cat)}
    <div class="chead">
      <h3>{cat}</h3><span class="muted small">{CAT_DESC[cat] ?? ''} · {items.filter((a) => a.reached >= 0).length}/{items.length}</span>
    </div>
    <div class="agrid">
      {#each items as a (a.id)}
        <button class="acard rar-{a.rarity}" class:claimable={a.claimable} onclick={() => (sel = a)}>
          <div class="aic rar-{a.rarity}">{a.icon}</div>
          <div class="ainfo">
            <div class="aname">{a.name}{#if a.reached >= 0 && a.tierLabels[a.reached]} <span class="atier">{a.tierLabels[a.reached]}</span>{/if}</div>
            <div class="abar"><span class="afill" class:full={a.done} style="width:{pctOf(a).toFixed(0)}%"></span></div>
            <div class="aval">{valLabel(a)}{#if a.claimable} · <span class="claimhint">+{a.cp} CP</span>{/if}</div>
          </div>
          {#if a.done}<div class="acheck">✓</div>{/if}
        </button>
      {/each}
    </div>
  {/each}
{/if}

<!-- Achievement-Detail-Overlay -->
{#if sel}
  <div class="ov" onclick={() => (sel = null)} role="presentation">
    <div class="odlg rar-{sel.rarity === 'locked' ? 'bronze' : sel.rarity}" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
      <button class="ox" onclick={() => (sel = null)} aria-label="Schließen">✕</button>
      <div class="oic rar-{sel.rarity === 'locked' ? 'bronze' : sel.rarity}">{sel.icon}</div>
      <div class="ocat">{sel.cat}{#if sel.reached >= 0 && sel.tierLabels[sel.reached]} · {sel.tierLabels[sel.reached]}{/if}</div>
      <h3 class="oname">{sel.name}</h3>
      <p class="odesc">{sel.desc}</p>
      <div class="obar"><span class="ofill" style="width:{pctOf(sel).toFixed(0)}%"></span></div>
      <div class="oval">{valLabel(sel)}</div>
      {#if sel.tiers.length > 1}
        <div class="otiers">{#each sel.tiers as t, i}<span class="ot" class:on={sel.reached >= i}>{sel.money ? fmt(t) : t}</span>{/each}</div>
      {/if}
      <div class="oreward">🎁 Belohnung: <b>+{sel.cp} CP</b></div>
      {#if sel.claimable}
        <button class="oclaim" onclick={() => claimAch(sel)} disabled={claimingId === sel.claimId}>{claimingId === sel.claimId ? '…' : `Belohnung einlösen (+${sel.cp} CP)`}</button>
      {:else if sel.reached >= 0}
        <div class="odone">✓ Freigeschaltet – Belohnung erhalten</div>
      {:else}
        <div class="omuted">Noch nicht freigeschaltet</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  h2 { margin: 8px 0 16px; }
  .hint { color: var(--muted, #9aa0ad); margin: 8px 0; } .muted { color: var(--muted, #9aa0ad); } .small { font-size: 0.8rem; }

  /* Hero */
  .hero { display: flex; align-items: center; gap: 20px; background: radial-gradient(120% 140% at 0% 0%, var(--accent-weak, rgba(110,124,255,.15)), transparent 60%), var(--surface, #14181f); border: 1px solid var(--border, #232833); border-radius: 18px; padding: 20px 22px; flex-wrap: wrap; }
  .ring { width: 76px; height: 76px; flex-shrink: 0; border-radius: 50%; background: conic-gradient(var(--accent, #6e7cff) 0turn, var(--surface-2, #1b202b) 0turn); display: flex; align-items: center; justify-content: center; }
  .ringn { width: 62px; height: 62px; border-radius: 50%; background: var(--surface-2, #1b202b); border: 2px solid var(--accent, #6e7cff); display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1; }
  .ringn span { font-size: 0.6rem; color: var(--muted); } .ringn b { color: var(--accent, #6e7cff); font-size: 1.7rem; }
  .hmain { flex: 1; min-width: 200px; }
  .htop { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 8px; font-size: 1.05rem; }
  .xpbar { height: 14px; background: #12151d; border-radius: 999px; overflow: hidden; }
  .xpfill { display: block; height: 100%; background: linear-gradient(90deg, var(--accent, #6e7cff), var(--accent-2, #8a7bff)); border-radius: 999px; }
  .chips { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  .chip { background: var(--surface-2, #1b202b); border: 1px solid var(--border, #2a2f3a); border-radius: 999px; padding: 5px 12px; font-size: 0.82rem; }
  .chip.cp { color: var(--accent, #6e7cff); font-weight: 700; } .chip.fire { color: var(--gold, #f5c451); }
  .bwrap { text-align: right; }
  .blabel { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 6px; }
  .bbig { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: 320px; }
  .bchip { background: var(--surface-2, #1b202b); border: 1px solid var(--border-strong, #38414f); border-radius: 999px; padding: 7px 12px; font-size: 0.9rem; font-weight: 600; }

  /* Quests */
  .quests { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; margin: 22px 0; }
  .qbox { background: var(--surface, #14181f); border: 1px solid var(--border, #232833); border-radius: 14px; padding: 14px 16px; }
  .qh { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; } .qh h3 { margin: 0; font-size: 1rem; }
  .qrow { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid var(--border, #232833); }
  .qrow:first-of-type { border-top: 0; }
  .qi { font-size: 1.15rem; flex-shrink: 0; }
  .qmain { flex: 1; min-width: 0; } .qt { font-size: 0.84rem; }
  .qbar { height: 6px; background: #12151d; border-radius: 999px; overflow: hidden; margin-top: 5px; }
  .qfill { display: block; height: 100%; background: linear-gradient(90deg, var(--accent, #6e7cff), var(--accent-2, #8a7bff)); border-radius: 999px; }
  .qrow.qd .qfill { background: var(--gold, #f5c451); }
  .qnum { font-size: 0.74rem; color: var(--muted); font-variant-numeric: tabular-nums; min-width: 34px; text-align: right; }
  .qtag { font-size: 0.74rem; color: var(--muted); } .qtag.ok { color: var(--pos, #86efac); font-weight: 700; }
  .qclaim { padding: 6px 12px; border-radius: 8px; border: 0; background: var(--accent, #6e7cff); color: var(--on-accent, #fff); font-weight: 700; font-size: 0.78rem; cursor: pointer; }

  /* Nächstes Achievement */
  .next { display: block; width: 100%; text-align: left; background: linear-gradient(135deg, rgba(245,196,81,.10), var(--surface, #14181f)); border: 1px solid var(--gold, #f5c451); border-radius: 16px; padding: 16px 18px; margin: 22px 0; cursor: pointer; }
  .nlabel { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gold, #f5c451); font-weight: 700; margin-bottom: 10px; }
  .nrow { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .nic { width: 60px; height: 60px; flex-shrink: 0; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 2rem; background: var(--surface-2, #1b202b); border: 2px solid; }
  .nmain { flex: 1; min-width: 180px; }
  .nname { font-weight: 700; font-size: 1.1rem; } .ndesc { font-size: 0.85rem; margin: 2px 0 8px; }
  .nbar { height: 10px; background: #12151d; border-radius: 999px; overflow: hidden; }
  .nfill { display: block; height: 100%; background: linear-gradient(90deg, var(--gold, #f5c451), #ffd97a); border-radius: 999px; }
  .nside { text-align: right; } .nval { font-weight: 800; font-variant-numeric: tabular-nums; } .nrew { color: var(--accent, #6e7cff); font-size: 0.8rem; font-weight: 700; }

  /* Sammlerpfad */
  .pathcard { display: flex; align-items: center; gap: 16px; background: var(--surface, #14181f); border: 1px solid var(--border, #232833); border-radius: 14px; padding: 14px 18px; margin: 22px 0; flex-wrap: wrap; }
  .picon { font-size: 1.8rem; }
  .pmain { flex: 1; min-width: 160px; } .ptitle { font-weight: 700; }
  .ppick { display: flex; gap: 8px; }
  .ppick select { padding: 9px 11px; border-radius: 8px; border: 1px solid var(--border, #2a2f3a); background: var(--surface-2, #12151d); color: inherit; font: inherit; }
  .save { padding: 9px 16px; border-radius: 8px; border: 0; background: var(--accent, #6e7cff); color: var(--on-accent, #fff); font-weight: 600; cursor: pointer; }

  /* Achievements */
  .chead { display: flex; align-items: baseline; gap: 10px; margin: 30px 0 12px; }
  .chead h3 { margin: 0; font-size: 1.1rem; }
  .agrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
  .acard { position: relative; display: flex; gap: 14px; align-items: center; text-align: left; background: var(--surface, #14181f); border: 1.5px solid var(--border, #232833); border-radius: 14px; padding: 14px; cursor: pointer; color: inherit; transition: transform 0.14s, box-shadow 0.14s, border-color 0.14s; }
  .acard:hover { transform: scale(1.02); }
  .aic { width: 46px; height: 46px; flex-shrink: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.7rem; background: var(--surface-2, #1b202b); border: 1.5px solid var(--border, #2a2f3a); }
  .ainfo { flex: 1; min-width: 0; }
  .aname { font-weight: 700; font-size: 0.9rem; } .atier { color: var(--gold, #f5c451); font-weight: 600; }
  .abar { height: 7px; background: #12151d; border-radius: 999px; overflow: hidden; margin: 6px 0 3px; }
  .afill { display: block; height: 100%; background: var(--accent, #6e7cff); border-radius: 999px; } .afill.full { background: var(--gold, #f5c451); }
  .aval { color: var(--muted); font-size: 0.74rem; font-variant-numeric: tabular-nums; } .claimhint { color: var(--accent, #6e7cff); font-weight: 700; }
  .acheck { position: absolute; top: 8px; right: 10px; color: var(--gold, #f5c451); font-weight: 800; }
  .acard.claimable { box-shadow: 0 0 0 2px var(--accent, #6e7cff) inset; }

  /* Seltenheiten */
  .rar-bronze { border-color: #b08d57; } .aic.rar-bronze { border-color: #b08d57; background: rgba(176,141,87,.14); }
  .rar-silber { border-color: #aeb7c2; } .aic.rar-silber { border-color: #aeb7c2; background: rgba(174,183,194,.14); }
  .rar-gold { border-color: var(--gold, #f5c451); box-shadow: 0 0 0 1px rgba(245,196,81,.25); } .aic.rar-gold { border-color: var(--gold, #f5c451); background: rgba(245,196,81,.14); }
  .rar-diamant { border-color: #5bd0ff; box-shadow: 0 0 18px -6px rgba(91,208,255,.55); } .aic.rar-diamant { border-color: #5bd0ff; background: rgba(91,208,255,.14); }
  .rar-legend { border-color: #c07be0; box-shadow: 0 0 20px -5px rgba(192,123,224,.6); animation: glow 2.4s ease-in-out infinite; } .aic.rar-legend { border-color: #c07be0; background: rgba(192,123,224,.16); }
  @keyframes glow { 0%,100% { box-shadow: 0 0 16px -6px rgba(192,123,224,.5); } 50% { box-shadow: 0 0 26px -4px rgba(192,123,224,.85); } }

  /* Overlay */
  .ov { position: fixed; inset: 0; background: rgba(6,8,14,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
  .odlg { position: relative; width: 100%; max-width: 400px; background: var(--surface, #14181f); border: 2px solid var(--border, #2a2f3a); border-radius: 18px; padding: 26px 24px; text-align: center; }
  .ox { position: absolute; top: 12px; right: 14px; width: 30px; height: 30px; border-radius: 999px; border: 1px solid var(--border, #2a2f3a); background: rgba(0,0,0,0.3); color: var(--muted); cursor: pointer; }
  .oic { width: 76px; height: 76px; margin: 4px auto 10px; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 2.6rem; background: var(--surface-2, #1b202b); border: 2px solid; }
  .ocat { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
  .oname { margin: 4px 0 8px; font-size: 1.35rem; }
  .odesc { color: var(--muted); font-size: 0.9rem; margin: 0 0 14px; }
  .obar { height: 10px; background: #12151d; border-radius: 999px; overflow: hidden; }
  .ofill { display: block; height: 100%; background: linear-gradient(90deg, var(--accent, #6e7cff), var(--accent-2, #8a7bff)); border-radius: 999px; }
  .oval { font-weight: 700; margin-top: 6px; font-variant-numeric: tabular-nums; }
  .otiers { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 12px 0; }
  .ot { padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border, #2a2f3a); font-size: 0.74rem; color: var(--muted); font-variant-numeric: tabular-nums; }
  .ot.on { border-color: var(--gold, #f5c451); color: var(--gold, #f5c451); }
  .oreward { margin: 8px 0 14px; } .oreward b { color: var(--accent, #6e7cff); }
  .oclaim { width: 100%; padding: 12px; border-radius: 10px; border: 0; background: var(--accent, #6e7cff); color: var(--on-accent, #fff); font-weight: 700; cursor: pointer; }
  .odone { color: var(--pos, #86efac); font-weight: 700; } .omuted { color: var(--muted); }

  @media (max-width: 640px) {
    .hero { gap: 14px; } .bwrap { text-align: left; width: 100%; } .bbig { justify-content: flex-start; max-width: none; }
    .nside { text-align: left; }
  }
</style>
