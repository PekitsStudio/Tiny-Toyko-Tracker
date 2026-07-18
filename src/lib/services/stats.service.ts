import { supabase } from '$lib/supabase';
import { listCards, listSold, type CollectionCard } from '$lib/services/collection.service';
import { listSealed, listGraded } from '$lib/services/extras.service';

export interface Bucket { key: string; count: number; value: number; }
export interface TopCard { id: number; name: string; image_url: string | null; game: string; value: number; quantity: number; currency: string | null; }

export interface Stats {
	cardCount: number; uniqueCount: number;
	value: number; invested: number; unrealized: number;
	realized: number; soldProceeds: number;
	byGame: Bucket[]; byRarity: Bucket[]; bySet: Bucket[]; byCondition: Bucket[]; byLanguage: Bucket[];
	topCards: TopCard[];
	sealedValue: number; gradedValue: number;
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

	let cardCount = 0, value = 0, invValue = 0, invested = 0;
	const games = new Map<string, { count: number; value: number }>();
	for (const c of cards) {
		const q = c.quantity ?? 1;
		cardCount += q;
		const v = (c.price_current ?? 0) * q;
		value += v;
		if (c.purchase_price != null) { invested += c.purchase_price * q; invValue += (c.price_current ?? 0) * q; }
		const g = games.get(c.game) ?? { count: 0, value: 0 };
		g.count += q; g.value += v; games.set(c.game, g);
	}
	const unrealized = invValue - invested;

	let realized = 0, soldProceeds = 0;
	for (const s of sold) {
		const q = s.quantity ?? 1;
		if (s.sold_price != null) soldProceeds += s.sold_price * q;
		if (s.sold_price != null && s.purchase_price != null) realized += (s.sold_price - s.purchase_price) * q;
	}

	const sealedValue = sealed.reduce((a, x) => a + (x.current_value ?? 0) * (x.quantity ?? 1), 0);
	const gradedValue = graded.reduce((a, x) => a + (x.value ?? 0), 0);

	const topCards: TopCard[] = [...cards]
		.map((c) => ({ id: c.id, name: c.name, image_url: c.image_url, game: c.game, quantity: c.quantity ?? 1, currency: c.currency, value: (c.price_current ?? 0) * (c.quantity ?? 1) }))
		.filter((c) => c.value > 0)
		.sort((a, b) => b.value - a.value)
		.slice(0, 8);

	return {
		cardCount, uniqueCount: cards.length, value, invested, unrealized, realized, soldProceeds,
		byGame: [...games.entries()].map(([game, g]) => ({ key: game, ...g })).sort((a, b) => b.value - a.value),
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
