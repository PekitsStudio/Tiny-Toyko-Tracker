<script lang="ts">
  import { fetchExportRows, importCards, EXPORT_COLUMNS } from '$lib/services/export.service';

  let importing = $state(false); let importMsg = $state(''); let busy = $state(false); let err = $state('');

  function download(name: string, content: string, mime: string) {
    const blob = new Blob(['﻿' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const escCsv = (v: unknown) => { const t = v == null ? '' : String(v); return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const escHtml = (v: unknown) => String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

  async function run(fn: () => Promise<void>) { err = ''; busy = true; try { await fn(); } catch (e) { err = (e as Error).message; } finally { busy = false; } }

  async function exportCsv() {
    const rows = await fetchExportRows();
    const head = EXPORT_COLUMNS.map(([h]) => h).join(';');
    const body = rows.map((r) => EXPORT_COLUMNS.map(([, f]) => escCsv(r[f])).join(';')).join('\n');
    download('sammlung.csv', head + '\n' + body, 'text/csv;charset=utf-8');
  }
  async function exportXlsx() {
    const rows = await fetchExportRows();
    const XLSX = await import('xlsx');
    const aoa = [EXPORT_COLUMNS.map(([h]) => h), ...rows.map((r) => EXPORT_COLUMNS.map(([, f]) => (r[f] ?? '') as string | number))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sammlung');
    XLSX.writeFile(wb, 'sammlung.xlsx');
  }
  async function printList() {
    const rows = await fetchExportRows();
    const cols = EXPORT_COLUMNS.filter(([h]) => !['BildURL', 'CardmarketURL', 'ExterneID'].includes(h));
    const w = window.open('', '_blank'); if (!w) return;
    const head = cols.map(([h]) => `<th>${h}</th>`).join('');
    const body = rows.map((r) => `<tr>${cols.map(([, f]) => `<td>${escHtml(r[f])}</td>`).join('')}</tr>`).join('');
    w.document.write(`<html><head><title>Bestandsliste</title><style>body{font-family:sans-serif;font-size:11px;padding:16px}h2{margin:0 0 10px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:3px 6px;text-align:left}th{background:#eee}</style></head><body><h2>Bestandsliste – ${rows.length} Einträge</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  function parseCsv(text: string): string[][] {
    const first = text.split('\n')[0] || '';
    const delim = first.includes(';') ? ';' : ',';
    const out: string[][] = []; let field = ''; let row: string[] = []; let inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += ch; }
      else if (ch === '"') inQ = true;
      else if (ch === delim) { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); out.push(row); row = []; field = ''; }
      else if (ch !== '\r') field += ch;
    }
    if (field.length || row.length) { row.push(field); out.push(row); }
    return out;
  }
  async function onImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0]; if (!file) return;
    importing = true; importMsg = '';
    try {
      const rows = parseCsv(await file.text()).filter((r) => r.some((c) => c.trim() !== ''));
      if (rows.length < 2) throw new Error('Keine Datenzeilen gefunden.');
      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const h2f = new Map(EXPORT_COLUMNS.map(([h, f]) => [h.toLowerCase(), f]));
      const items = rows.slice(1).map((r) => {
        const o: Record<string, string> = {};
        headers.forEach((h, idx) => { const f = h2f.get(h); if (f) o[f] = (r[idx] ?? '').trim(); });
        return o;
      });
      const n = await importCards(items);
      importMsg = `${n} Karten importiert.`;
    } catch (er) { importMsg = (er as Error).message; }
    finally { importing = false; input.value = ''; }
  }
</script>

<h2>Exportieren, Drucken &amp; Import</h2>
{#if err}<div class="hint err">{err}</div>{/if}

<h3>Export &amp; Druck</h3>
<div class="exports">
  <button onclick={() => run(exportCsv)} disabled={busy}>CSV exportieren</button>
  <button onclick={() => run(exportXlsx)} disabled={busy}>Excel (.xlsx) exportieren</button>
  <button onclick={() => run(printList)} disabled={busy}>Bestandsliste drucken</button>
</div>

<h3>Import</h3>
<div class="import">
  <label class="filebtn">
    CSV importieren…
    <input type="file" accept=".csv,text/csv" onchange={onImport} disabled={importing} />
  </label>
  {#if importing}<span class="muted">importiere…</span>{/if}
  {#if importMsg}<span class="imsg">{importMsg}</span>{/if}
  <div class="muted small">Format wie beim CSV-Export (Spalten: Spiel, Name, Set, Anzahl, Zustand, Kaufpreis …).</div>
</div>

<style>
  h2 { margin: 8px 0 14px; } h3 { margin: 22px 0 10px; font-size: 1.05rem; }
  .exports { display: flex; gap: 10px; flex-wrap: wrap; }
  .exports button { padding: 9px 16px; border-radius: 8px; border: 1px solid #2a2f3a; background: #12151d; color: inherit; cursor: pointer; font-weight: 600; }
  .import { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .filebtn { padding: 9px 16px; border-radius: 8px; border: 1px solid #2a2f3a; background: var(--accent, #6366f1); color: #fff; cursor: pointer; font-weight: 600; position: relative; overflow: hidden; }
  .filebtn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .muted { color: var(--muted, #9aa0ad); } .small { font-size: 0.78rem; width: 100%; }
  .imsg { color: #86efac; }
  .hint { color: var(--muted, #9aa0ad); margin: 8px 0; } .hint.err { color: #fca5a5; }
</style>
