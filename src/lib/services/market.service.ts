import { supabase } from '$lib/supabase';

// Spiegelt die View market_cards (alle zum Verkauf angebotenen Karten aller Nutzer).
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
