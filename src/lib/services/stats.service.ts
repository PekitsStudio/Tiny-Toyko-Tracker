import { supabase } from '$lib/supabase';
import { listCards, listSold, type CollectionCard } from '$lib/services/collection.service';
import { listSealed, listGraded } from '$lib/services/extras.service';

// Geldbetraege werden pro Waehrung getrennt gefuehrt (EUR/USD gemischt), damit
// nichts faelschlich als ein Euro-Wert aufsummiert wird.
export type Money = Record<string, number>;
export interface Bucket { key: string; count: number; value: number; currency?: string; }
export interface TopCard { id: number; name: string; image_url: string | null; game: string; value: number; quantity: number; currency: string | null; }

export interface Stats {
	cardCount: number; uniqueCount: number;
	value: Money; invested: Money; unrealized: Money;
	realized: Money; soldProceeds: Money;
	byGame: Bucket[]; byRarity: Bucket[]; bySet: Bucket[]; byCondition: Bucket[]; byLanguage: Bucket[];
	topCards: TopCard[];
	sealedValue: Money; gradedValue: number;
}

// Hilfsfunktionen fuer Betraege pro Waehrung.
function addMoney(m: Money, currency: string | null | undefined, amount: number): void {
	const c = currency || 'EUR';
	m[c] = (m[c] ?? 0) + amount;
}
export function mergeMoney(...maps: Money[]): Money {
	const out: Money = {};
	for (const m of maps) for (const [c, v] of Object.entries(m)) out[c] = (out[c] ?? 0) + v;
	return out;
}

function bucketize(cards: CollectionCard[], keyFn: (c: CollectionCard) => string | null | undefined): Bucket[] {
	const m = new Map<string, { count: number; value: number }>();
	for (const c of cards) {
		const raw = keyFn(c);
		const key = raw && String(raw).trim() ? String(raw).trim() : '—';
		const q = c.quantity ?? 1;
		const b = m.get(key) ?? { count: 0, value: 0 };
		b.count += q;
		b.value += (c.price_current ?? 0) * q;
		m.set(key, b);
	}
	return [...m.entries()].map(([key, b]) => ({ key, ...b })).sort((a, b) => b.value - a.value);
}

export async function computeStats(): Promise<Stats> {
	const [cards, sold, sealed, graded] = await Promise.all([listCards(), listSold(), listSealed(), listGraded()]);

	let cardCount = 0;
	const value: Money = {}, invValue: Money = {}, invested: Money = {};
	const games = new Map<string, { count: number; value: number; currency: string }>();
	for (const c of cards) {
		const q = c.quantity ?? 1;
		const cur = c.currency || 'EUR';
		cardCount += q;
		const v = (c.price_current ?? 0) * q;
		addMoney(value, cur, v);
		if (c.purchase_price != null) { addMoney(invested, cur, c.purchase_price * q); addMoney(invValue, cur, (c.price_current ?? 0) * q); }
		const g = games.get(c.game) ?? { count: 0, value: 0, currency: cur };
		g.count += q; g.value += v; g.currency = cur; games.set(c.game, g);
	}
	const unrealized: Money = {};
	for (const cur of new Set([...Object.keys(invValue), ...Object.keys(invested)])) {
		unrealized[cur] = (invValue[cur] ?? 0) - (invested[cur] ?? 0);
	}

	const realized: Money = {}, soldProceeds: Money = {};
	for (const s of sold) {
		const q = s.quantity ?? 1; const cur = s.currency || 'EUR';
		if (s.sold_price != null) addMoney(soldProceeds, cur, s.sold_price * q);
		if (s.sold_price != null && s.purchase_price != null) addMoney(realized, cur, (s.sold_price - s.purchase_price) * q);
	}

	const sealedValue: Money = {};
	for (const x of sealed) addMoney(sealedValue, x.currency, (x.current_value ?? 0) * (x.quantity ?? 1));
	const gradedValue = graded.reduce((a, x) => a + (x.value ?? 0), 0);

	const topCards: TopCard[] = [...cards]
		.map((c) => ({ id: c.id, name: c.name, image_url: c.image_url, game: c.game, quantity: c.quantity ?? 1, currency: c.currency, value: (c.price_current ?? 0) * (c.quantity ?? 1) }))
		.filter((c) => c.value > 0)
		.sort((a, b) => b.value - a.value)
		.slice(0, 8);

	return {
		cardCount, uniqueCount: cards.length, value, invested, unrealized, realized, soldProceeds,
		byGame: [...games.entries()].map(([game, g]) => ({ key: game, count: g.count, value: g.value, currency: g.currency })).sort((a, b) => b.value - a.value),
		byRarity: bucketize(cards, (c) => c.rarity).slice(0, 10),
		bySet: bucketize(cards, (c) => c.set_name).slice(0, 10),
		byCondition: bucketize(cards, (c) => c.condition),
		byLanguage: bucketize(cards, (c) => c.language),
		topCards,
		sealedValue, gradedValue
	};
}

// --- Wertverlauf (value_history) --------------------------------------------
export interface HistPoint { day: string; total: number; }

export async function recordSnapshot(total: number): Promise<void> {
	const { data } = await supabase().auth.getUser();
	if (!data.user) return;
	const day = new Date().toISOString().slice(0, 10);
	await supabase().from('value_history').upsert(
		{ user_id: data.user.id, day, total, recorded_at: new Date().toISOString() },
		{ onConflict: 'user_id,day' }
	);
}

export async function getValueHistory(): Promise<HistPoint[]> {
	const { data, error } = await supabase().from('value_history').select('day, total').order('day', { ascending: true });
	if (error) return [];
	return ((data ?? []) as { day: string; total: number | null }[]).map((r) => ({ day: r.day, total: r.total ?? 0 }));
}
