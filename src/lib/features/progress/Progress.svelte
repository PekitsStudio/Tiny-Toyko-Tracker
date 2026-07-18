<script lang="ts">
  import { onMount } from 'svelte';
  import { getProgress, setCollectorPath, COLLECTOR_PATHS, type Progress, type Achievement } from '$lib/services/gamification.service';
  import { fmt } from '$lib/format';

  let p = $state<Progress | null>(null);
  let loading = $state(false); let status = $state(''); let path = $state(''); let pathBusy = $state(false);

  async function load() {
    loading = true; status = '';
    try { p = await getProgress(); path = p.path ?? ''; }
    catch (e) { const m = (e as Error).message; status = m === 'Nicht eingeloggt' ? 'Bitte oben anmelden.' : m; }
    finally { loading = false; }
  }
  onMount(load);

  async function savePath() {
    pathBusy = true;
    try { await setCollectorPath(path); if (p) p.path = path || null; }
    catch (e) { status = (e as Error).message; } finally { pathBusy = false; }
  }

  const groups = $derived.by(() => {
    if (!p) return [] as [string, Achievement[]][];
    const m = new Map<string, Achievement[]>();
    for (const a of p.achievements) { const arr = m.get(a.cat) ?? []; arr.push(a); m.set(a.cat, arr); }
    return [...m.entries()];
  });

  function pctOf(a: Achievement): number {
    if (a.done) return 100;
    const lo = a.reached >= 0 ? a.tiers[a.reached] : 0;
    const hi = a.nextThreshold ?? a.tiers[a.tiers.length - 1];
    return Math.max(3, Math.min(100, ((a.value - lo) / ((hi - lo) || 1)) * 100));
  }
  function valLabel(a: Achievement): string {
    const cur = a.money ? fmt(a.value) : String(Math.round(a.value));
    if (a.done) return cur + ' ✓';
    const tgt = a.nextThreshold != null ? (a.money ? fmt(a.nextThreshold) : String(a.nextThreshold)) : '';
    return tgt ? `${cur} / ${tgt}` : cur;
  }
</script>

<h2>Fortschritt</h2>
{#if status}<div class="hint">{status}</div>{/if}
{#if loading && !p}<div class="hint">Lädt…</div>{/if}

{#if p}
  <!-- Level -->
  <section class="lvlbox">
    <div class="lvlring">Lv<br /><b>{p.level}</b></div>
    <div class="lvlmain">
      <div class="lvltop"><b>Level {p.level}</b><span class="muted">{p.into} / {p.need} XP · gesamt {Math.round(p.xp)} XP</span></div>
      <div class="xpbar"><span class="xpfill" style="width:{Math.max(3, (p.into / p.need) * 100).toFixed(0)}%"></span></div>
      <div class="chips">
        <span class="chip fire">🔥 Streak {p.streak}{#if p.bestStreak > p.streak} · Best {p.bestStreak}{/if}</span>
        <span class="chip">🏅 {p.earned}/{p.total} Erfolge</span>
      </div>
    </div>
  </section>

  <!-- Badges -->
  {#if p.badges.length}
    <div class="badges">
      {#each p.badges as b}<span class="badge">{b}</span>{/each}
    </div>
  {/if}

  <!-- Sammlerpfad -->
  <section class="pathbox">
    <div>
      <div class="ph">🧭 Sammlerpfad</div>
      <div class="muted small">Wähle deinen Schwerpunkt – passende Titel & (bald) Quests.</div>
    </div>
    <div class="pathpick">
      <select bind:value={path}>
        <option value="">— keiner —</option>
        {#each COLLECTOR_PATHS as cp}<option value={cp.key}>{cp.icon} {cp.label}</option>{/each}
      </select>
      <button class="save" onclick={savePath} disabled={pathBusy}>{pathBusy ? '…' : 'Speichern'}</button>
    </div>
  </section>

  <!-- Achievements -->
  {#each groups as [cat, items] (cat)}
    <h3 class="ch">{cat}</h3>
    <div class="agrid">
      {#each items as a (a.id)}
        <div class="acard" class:done={a.done}>
          <div class="aicon">{a.icon}</div>
          <div class="ainfo">
            <div class="aname">{a.name}{#if a.reached >= 0 && a.tierLabels[a.reached]} · <span class="atier">{a.tierLabels[a.reached]}</span>{/if}</div>
            <div class="abar"><span class="afill" class:full={a.done} style="width:{pctOf(a).toFixed(0)}%"></span></div>
            <div class="aval">{valLabel(a)}</div>
          </div>
          {#if a.done}<div class="acheck">✓</div>{/if}
        </div>
      {/each}
    </div>
  {/each}
{/if}

<style>
  h2 { margin: 8px 0 14px; } .ch { margin: 22px 0 10px; font-size: 1.02rem; }
  .hint { color: var(--muted, #9aa0ad); margin: 8px 0; } .muted { color: var(--muted, #9aa0ad); } .small { font-size: 0.8rem; }

  .lvlbox { display: flex; align-items: center; gap: 18px; background: radial-gradient(120% 140% at 0% 0%, var(--accent-weak, rgba(110,124,255,.15)), transparent 60%), var(--surface, #14181f); border: 1px solid var(--border, #232833); border-radius: 16px; padding: 18px 20px; }
  .lvlring { width: 68px; height: 68px; flex-shrink: 0; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--surface-2, #1b202b); border: 2px solid var(--accent, #6e7cff); color: var(--muted); font-size: 0.62rem; line-height: 1.1; text-align: center; }
  .lvlring b { color: var(--accent, #6e7cff); font-size: 1.5rem; }
  .lvlmain { flex: 1; min-width: 0; }
  .lvltop { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; font-size: 0.9rem; }
  .xpbar { height: 12px; background: #12151d; border-radius: 999px; overflow: hidden; }
  .xpfill { display: block; height: 100%; background: linear-gradient(90deg, var(--accent, #6e7cff), var(--accent-2, #8a7bff)); border-radius: 999px; }
  .chips { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .chip { background: var(--surface-2, #1b202b); border: 1px solid var(--border, #2a2f3a); border-radius: 999px; padding: 4px 11px; font-size: 0.8rem; }
  .chip.fire { color: var(--gold, #f5c451); }

  .badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 4px; }
  .badge { background: var(--surface, #14181f); border: 1px solid var(--border-strong, #38414f); border-radius: 999px; padding: 6px 12px; font-size: 0.82rem; font-weight: 600; }

  .pathbox { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; background: var(--surface, #14181f); border: 1px solid var(--border, #232833); border-radius: 14px; padding: 14px 18px; margin: 16px 0 4px; }
  .ph { font-weight: 700; }
  .pathpick { display: flex; gap: 8px; }
  .pathpick select { padding: 9px 11px; border-radius: 8px; border: 1px solid var(--border, #2a2f3a); background: var(--surface-2, #12151d); color: inherit; font: inherit; }
  .save { padding: 9px 16px; border-radius: 8px; border: 0; background: var(--accent, #6e7cff); color: var(--on-accent, #fff); font-weight: 600; cursor: pointer; }

  .agrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .acard { position: relative; display: flex; gap: 12px; align-items: center; background: var(--surface, #14181f); border: 1px solid var(--border, #232833); border-radius: 12px; padding: 12px 14px; }
  .acard.done { border-color: var(--gold, #f5c451); background: linear-gradient(0deg, var(--gold-weak, rgba(242,184,90,.10)), transparent); }
  .aicon { font-size: 1.5rem; flex-shrink: 0; }
  .ainfo { flex: 1; min-width: 0; }
  .aname { font-weight: 600; font-size: 0.88rem; } .atier { color: var(--gold, #f5c451); }
  .abar { height: 7px; background: #12151d; border-radius: 999px; overflow: hidden; margin: 5px 0 3px; }
  .afill { display: block; height: 100%; background: var(--accent, #6e7cff); border-radius: 999px; } .afill.full { background: var(--gold, #f5c451); }
  .aval { color: var(--muted, #9aa0ad); font-size: 0.74rem; font-variant-numeric: tabular-nums; }
  .acheck { position: absolute; top: 8px; right: 10px; color: var(--gold, #f5c451); font-weight: 800; }
</style>
