import { supabase } from '$lib/supabase';
import type { SearchCard } from '$lib/types';

// Optionale Zusatzfelder beim Hinzufuegen (Menge, Zustand, Sprache).
export type AddOptions = {
	quantity?: number;
	condition?: string;
	language?: string;
	notes?: string;
	purchasePrice?: number | null;
};

function must<T>(res: { data: T | null; error: { message?: string } | null }): T {
	if (res.error) throw new Error(res.error.message || 'Datenbankfehler');
	return res.data as T;
}

async function currentUserId(): Promise<string> {
	const { data, error } = await supabase().auth.getUser();
	if (error || !data.user) throw new Error('Nicht eingeloggt');
	return data.user.id;
}

function cardRow(c: SearchCard, o: AddOptions, user_id: string) {
	return {
		user_id,
		game: c.game,
		external_id: c.externalId,
		name: c.name,
		set_name: c.setName ?? null,
		set_code: c.setCode ?? c.set_code ?? null,
		number: c.number ?? null,
		rarity: c.rarity ?? null,
		image_url: c.imageUrl ?? null,
		cardmarket_url: c.cardmarketUrl ?? null,
		quantity: o.quantity ?? 1,
		condition: o.condition ?? 'NM',
		language: o.language ?? c.lang?.toUpperCase() ?? 'DE',
		notes: o.notes ?? null,
		price_at_add: c.cardmarketPrice ?? null,
		price_current: c.cardmarketPrice ?? null,
		price_low: c.priceLow ?? null,
		price_trend: c.priceTrend ?? null,
		currency: c.currency ?? 'EUR',
		purchase_price: o.purchasePrice ?? null,
		status: 'owned'
	};
}

export async function addCard(c: SearchCard, o: AddOptions = {}) {
	const user_id = await currentUserId();
	return must(await supabase().from('cards').insert(cardRow(c, o, user_id)).select().single());
}

export async function addWishlist(c: SearchCard) {
	const user_id = await currentUserId();
	const language = c.lang?.toUpperCase() ?? 'DE';
	const existing = await supabase()
		.from('wishlist')
		.select('id')
		.eq('game', c.game)
		.eq('external_id', c.externalId)
		.eq('language', language)
		.maybeSingle();
	if (existing.data) return existing.data;
	const row = {
		user_id,
		game: c.game,
		external_id: c.externalId,
		name: c.name,
		set_name: c.setName ?? null,
		set_code: c.setCode ?? c.set_code ?? null,
		number: c.number ?? null,
		rarity: c.rarity ?? null,
		image_url: c.imageUrl ?? null,
		cardmarket_url: c.cardmarketUrl ?? null,
		quantity: 1,
		language,
		price_current: c.cardmarketPrice ?? null,
		price_low: c.priceLow ?? null,
		price_trend: c.priceTrend ?? null,
		currency: c.currency ?? 'EUR'
	};
	return must(await supabase().from('wishlist').insert(row).select().single());
}
