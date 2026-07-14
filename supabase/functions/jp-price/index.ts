// Supabase Edge Function: "jp-price"
// Liefert den Cardmarket-/TCGplayer-Preis einer JAPANISCHEN Pokemon-Karte ueber
// PokemonPriceTracker (PPT) -- mit gemeinsamem Cache in der Tabelle jp_price_cache.
//
// Ablauf pro Anfrage (?external_id=..&name=..&number=..):
//   1) Cache lesen. Ist der Eintrag frisch (< TTL), sofort zurueckgeben.
//   2) Sonst PPT mit dem GEHEIMEN Server-Key abfragen, Ergebnis cachen, zurueckgeben.
//   3) Bei 429 (Tageslimit) oder Fehler: den (evtl. veralteten) Cache zurueckgeben.
//
// Noetige Secrets/Env (im Supabase-Dashboard setzen):
//   POKEPRICE_API_KEY          -> dein PokemonPriceTracker-Key
//   SUPABASE_URL               -> automatisch vorhanden
//   SUPABASE_SERVICE_ROLE_KEY  -> automatisch vorhanden
//
// Deploy-Tipp: "Verify JWT" fuer diese Function AUS lassen (sie liefert nur
// oeffentliche Preisdaten und schuetzt das Kontingent ueber den Cache).

const TTL_MS = 24 * 60 * 60 * 1000; // 24 Stunden Cache-Gueltigkeit

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function pos(v: unknown): number | null {
  const n = parseFloat(String(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Preis aus der PPT-Antwort ziehen: Cardmarket-EUR bevorzugt, sonst TCGplayer-USD.
function extractPrice(ppt: any, number: string) {
  let list = (ppt && (ppt.data || ppt.cards)) || [];
  if (!Array.isArray(list)) list = list ? [list] : [];
  if (!list.length) return null;
  const card = (number && list.find((c: any) => String(c.cardNumber) === number)) || list[0];
  const pr = (card && card.prices) || {};
  const cm = pr.cardmarket || card.cardmarket || null;
  const eur = pos(
    pr.cardmarketMarket ?? pr.cardmarketEur ?? pr.eur ??
    (cm && (cm.market ?? cm.avg ?? cm.trend ?? cm.averageSellPrice)),
  );
  if (eur != null) {
    return { price: eur, low: pos(pr.cardmarketLow ?? (cm && (cm.low ?? cm.lowPrice))), currency: 'EUR' };
  }
  const usd = pos(pr.market ?? pr.marketPrice);
  if (usd != null) return { price: usd, low: pos(pr.low ?? pr.lowPrice), currency: 'USD' };
  return null;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PPT_KEY = Deno.env.get('POKEPRICE_API_KEY') ?? '';

async function readCache(externalId: string) {
  const url = `${SUPABASE_URL}/rest/v1/jp_price_cache?external_id=eq.${encodeURIComponent(externalId)}&select=*`;
  const r = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function writeCache(row: { external_id: string; price: number; low: number | null; currency: string }) {
  await fetch(`${SUPABASE_URL}/rest/v1/jp_price_cache`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ ...row, fetched_at: new Date().toISOString() }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = new URL(req.url);
  const externalId = (url.searchParams.get('external_id') || '').trim();
  const name = (url.searchParams.get('name') || '').trim();
  const number = (url.searchParams.get('number') || '').trim();
  if (!externalId) return json({ price: null });

  // 1) Cache
  let cached: any = null;
  try { cached = await readCache(externalId); } catch { cached = null; }
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < TTL_MS) {
    return json({ price: cached.price, low: cached.low, currency: cached.currency, cached: true });
  }

  // 2) Kein/abgelaufener Cache -> PPT abfragen
  if (!PPT_KEY) {
    if (cached) return json({ price: cached.price, low: cached.low, currency: cached.currency, stale: true });
    return json({ price: null, reason: 'no-server-key' });
  }

  const q = [name, number].filter(Boolean).join(' ').trim();
  if (!q) {
    if (cached) return json({ price: cached.price, low: cached.low, currency: cached.currency, stale: true });
    return json({ price: null });
  }

  try {
    const res = await fetch(
      `https://www.pokemonpricetracker.com/api/v2/cards?language=japanese&search=${encodeURIComponent(q)}&includeCardmarket=true&limit=1`,
      { headers: { Authorization: `Bearer ${PPT_KEY}`, Accept: 'application/json' } },
    );
    if (res.status === 429) {
      // Tageslimit erreicht -> alten Cache liefern, sonst leer.
      if (cached) return json({ price: cached.price, low: cached.low, currency: cached.currency, stale: true });
      return json({ price: null, limited: true });
    }
    if (res.ok) {
      const data = await res.json();
      const result = extractPrice(data, number);
      if (result && result.price != null) {
        try { await writeCache({ external_id: externalId, price: result.price, low: result.low, currency: result.currency }); } catch { /* Cache-Schreibfehler ignorieren */ }
        return json({ ...result, cached: false });
      }
    }
  } catch { /* Netz-/Parsefehler -> unten Fallback */ }

  // 3) Fallback: veralteter Cache, sonst kein Preis.
  if (cached) return json({ price: cached.price, low: cached.low, currency: cached.currency, stale: true });
  return json({ price: null });
});
