import { supabase } from '$lib/supabase';

async function requireUser(): Promise<string> {
	const { data, error } = await supabase().auth.getUser();
	if (error || !data.user) throw new Error('Nicht eingeloggt');
	return data.user.id;
}

// --- Angebote (market_cards) ---
export interface MarketCard {
	id: number;
	game: string;
	name: string;
	set_name: string | null;
	set_code: string | null;
	number: string | null;
	rarity: string | null;
	image_url: string | null;
	cardmarket_url: string | null;
	language: string | null;
	condition: string | null;
	quantity: number | null;
	asking_price: number | null;
	currency: string | null;
	price_current: number | null;
	seller_name: string | null;
	seller_contact: string | null;
	is_mine: boolean;
}

export async function listMarket(opts: { game?: string; q?: string } = {}): Promise<MarketCard[]> {
	let query = supabase().from('market_cards').select('*');
	if (opts.game) query = query.eq('game', opts.game);
	if (opts.q && opts.q.trim()) query = query.ilike('name', `%${opts.q.trim()}%`);
	const { data, error } = await query
		.order('asking_price', { ascending: true, nullsFirst: false })
		.limit(300);
	if (error) throw new Error(error.message);
	return (data ?? []) as MarketCard[];
}

export async function setForSale(
	cardId: number,
	forSale: boolean,
	askingPrice: number | null
): Promise<void> {
	await requireUser();
	const { error } = await supabase()
		.from('cards')
		.update({ for_sale: forSale, asking_price: forSale ? askingPrice : null })
		.eq('id', cardId);
	if (error) throw new Error(error.message);
}

// --- Gesuche / "Suche" (seeking_cards) ---
export interface SeekingCard {
	id: number;
	game: string;
	name: string;
	set_name: string | null;
	number: string | null;
	rarity: string | null;
	image_url: string | null;
	cardmarket_url: string | null;
	language: string | null;
	seek_condition: string | null;
	seek_max_price: number | null;
	seek_currency: string | null;
	price_current: number | null;
	seeker_name: string | null;
	seeker_contact: string | null;
	seeker_country: string | null;
	is_mine: boolean;
}

export async function listSeeking(opts: { game?: string; q?: string } = {}): Promise<SeekingCard[]> {
	let query = supabase().from('seeking_cards').select('*');
	if (opts.game) query = query.eq('game', opts.game);
	if (opts.q && opts.q.trim()) query = query.ilike('name', `%${opts.q.trim()}%`);
	const { data, error } = await query.limit(300);
	if (error) throw new Error(error.message);
	return (data ?? []) as SeekingCard[];
}

// Eigene Wunschlisten-Karte oeffentlich suchen / zurueckziehen.
export async function setSeeking(
	wishlistId: number,
	seeking: boolean,
	maxPrice: number | null
): Promise<void> {
	await requireUser();
	const { error } = await supabase()
		.from('wishlist')
		.update({ seeking, seek_max_price: seeking ? maxPrice : null })
		.eq('id', wishlistId);
	if (error) throw new Error(error.message);
}
