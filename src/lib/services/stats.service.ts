import { listCards, listSold } from '$lib/services/collection.service';
import { listSealed, listGraded } from '$lib/services/extras.service';

export interface Stats {
	cardCount: number; uniqueCount: number;
	value: number; invested: number; unrealized: number;
	realized: number; soldProceeds: number;
	byGame: { game: string; count: number; value: number }[];
	sealedValue: number; gradedValue: number;
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

	return {
		cardCount, uniqueCount: cards.length, value, invested, unrealized, realized, soldProceeds,
		byGame: [...games.entries()].map(([game, g]) => ({ game, ...g })).sort((a, b) => b.value - a.value),
		sealedValue, gradedValue
	};
}
