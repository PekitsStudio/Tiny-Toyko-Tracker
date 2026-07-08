import { supabase } from '$lib/supabase';
import { Adapters } from '$lib/adapters/tcg-adapters.js';
import type { SearchCard } from '$lib/types';

type PriceResult = { price: number | null; low: number | null; trend: number | null; currency?: string };
const PriceEngine = Adapters as unknown as {
	fetchPrices: (game: string, externalId: string, opts?: { lang?: string }) => Promise<PriceResult>;
};

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

// --- Sammlung anzeigen ---
export interface CollectionCard {
	id: number;
	game: string;
	name: string;
	set_name: string | null;
	number: string | null;
	rarity: string | null;
	image_url: string | null;
	quantity: number;
	condition: string | null;
	language: string | null;
	price_current: number | null;
	currency: string | null;
	notes: string | null;
}

export async function listCards(): Promise<CollectionCard[]> {
	await currentUserId(); // wirft "Nicht eingeloggt", wenn keine Session
	return must(
		await supabase()
			.from('cards')
			.select(
				'id, game, name, set_name, number, rarity, image_url, quantity, condition, language, price_current, currency, notes'
			)
			.eq('status', 'owned')
			.order('added_at', { ascending: false })
	);
}

export async function deleteCard(id: number): Promise<void> {
	await currentUserId();
	await supabase().from('card_price_history').delete().eq('card_id', id);
	const { error } = await supabase().from('cards').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

export async function setCardQuantity(id: number, quantity: number): Promise<void> {
	await currentUserId();
	const q = Math.max(1, Math.floor(quantity));
	const { error } = await supabase().from('cards').update({ quantity: q }).eq('id', id);
	if (error) throw new Error(error.message);
}

// Beliebige erlaubte Felder einer Sammlungskarte aendern (Zustand, Sprache, Menge, Notiz).
const CARD_EDITABLE = ['quantity', 'condition', 'language', 'notes'] as const;
export type CardPatch = Partial<Record<(typeof CARD_EDITABLE)[number], string | number | null>>;

export async function updateCard(id: number, fields: CardPatch): Promise<void> {
	await currentUserId();
	const patch: Record<string, unknown> = {};
	for (const k of CARD_EDITABLE) if (fields[k] !== undefined) patch[k] = fields[k];
	if (!Object.keys(patch).length) return;
	const { error } = await supabase().from('cards').update(patch).eq('id', id);
	if (error) throw new Error(error.message);
}

// --- Wunschliste ---
export interface WishlistItem {
	id: number;
	game: string;
	name: string;
	set_name: string | null;
	number: string | null;
	rarity: string | null;
	image_url: string | null;
	language: string | null;
	price_current: number | null;
	price_low: number | null;
	price_trend: number | null;
	currency: string | null;
	cardmarket_url: string | null;
}

export async function listWishlist(): Promise<WishlistItem[]> {
	await currentUserId();
	return must(
		await supabase()
			.from('wishlist')
			.select(
				'id, game, name, set_name, number, rarity, image_url, language, price_current, price_low, price_trend, currency, cardmarket_url'
			)
			.order('id', { ascending: false })
	);
}

export async function deleteWishlist(id: number): Promise<void> {
	await currentUserId();
	const { error } = await supabase().from('wishlist').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

// --- Preise aktualisieren (Sammlung) ---
export async function refreshCollectionPrices(
	onProgress?: (done: number, total: number) => void
): Promise<{ updated: number; total: number }> {
	await currentUserId();
	const rows = must(
		await supabase().from('cards').select('id, game, external_id, language').eq('status', 'owned')
	) as { id: number; game: string; external_id: string; language: string | null }[];

	let updated = 0;
	let done = 0;
	let i = 0;
	const CONCURRENCY = 6;

	async function worker() {
		while (i < rows.length) {
			const r = rows[i++];
			try {
				const p = await PriceEngine.fetchPrices(r.game, r.external_id, {
					lang: r.language ? r.language.toLowerCase() : undefined
				});
				if (p && (p.price !== null || p.low !== null || p.trend !== null)) {
					const patch: Record<string, unknown> = {
						price_current: p.price,
						price_low: p.low,
						price_trend: p.trend
					};
					if (p.currency) patch.currency = p.currency;
					await supabase().from('cards').update(patch).eq('id', r.id);
					updated++;
				}
			} catch {
				/* einzelne Fehler stoppen den Rest nicht */
			}
			done++;
			onProgress?.(done, rows.length);
		}
	}

	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker));
	return { updated, total: rows.length };
}
