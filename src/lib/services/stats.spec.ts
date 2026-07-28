import { describe, it, expect } from 'vitest';
import { mergeMoney, magnitude, aggregate } from '$lib/services/stats.service';
import type { CollectionCard } from '$lib/services/collection.service';

describe('mergeMoney', () => {
	it('summiert pro Währung, ohne zu vermischen', () => {
		expect(mergeMoney({ EUR: 10, USD: 5 }, { EUR: 2 })).toEqual({ EUR: 12, USD: 5 });
	});
	it('behandelt leere Maps', () => {
		expect(mergeMoney({}, { USD: 3 })).toEqual({ USD: 3 });
		expect(mergeMoney()).toEqual({});
	});
});

describe('magnitude', () => {
	it('summiert die Beträge über alle Währungen', () => {
		expect(magnitude({ EUR: 10, USD: 5 })).toBe(15);
		expect(magnitude({})).toBe(0);
	});
});

// Vollständige Sammlungskarte mit Overrides (deckt alle Pflichtfelder ab).
function card(over: Partial<CollectionCard>): CollectionCard {
	return {
		id: 1, game: 'pokemon', name: 'X', set_name: null, number: null, rarity: null, image_url: null,
		quantity: 1, condition: null, language: null, price_current: 0, currency: 'EUR', notes: null,
		for_sale: null, asking_price: null, purchase_price: null, purchase_date: null, external_id: null,
		...over
	};
}

describe('aggregate', () => {
	it('trennt Währungen und vermischt EUR/USD nicht', () => {
		const cards = [
			card({ game: 'pokemon', price_current: 10, currency: 'EUR', quantity: 2 }), // 20 EUR
			card({ game: 'magic', price_current: 5, currency: 'EUR' }), //                  5 EUR
			card({ game: 'onepiece', price_current: 4, currency: 'USD', quantity: 3 }) //  12 USD
		];
		const s = aggregate(cards, [], [], []);
		expect(s.value).toEqual({ EUR: 25, USD: 12 });
		expect(s.cardCount).toBe(6);
	});

	it('byGame trägt Money je Spiel (kein Überschreiben der Währung)', () => {
		const cards = [
			card({ game: 'magic', price_current: 8, currency: 'EUR' }),
			card({ game: 'magic', price_current: 3, currency: 'USD' })
		];
		const s = aggregate(cards, [], [], []);
		const magic = s.byGame.find((b) => b.key === 'magic');
		expect(magic?.value).toEqual({ EUR: 8, USD: 3 });
	});

	it('bucketize (nach Set) trennt ebenfalls je Währung', () => {
		const cards = [
			card({ set_name: 'Base', price_current: 10, currency: 'EUR' }),
			card({ set_name: 'Base', price_current: 2, currency: 'USD' })
		];
		const s = aggregate(cards, [], [], []);
		expect(s.bySet[0].value).toEqual({ EUR: 10, USD: 2 });
	});

	it('unrealisiert = aktueller Wert − Einstand, pro Währung', () => {
		const cards = [card({ price_current: 15, purchase_price: 10, currency: 'EUR' })];
		const s = aggregate(cards, [], [], []);
		expect(s.unrealized).toEqual({ EUR: 5 });
	});
});
