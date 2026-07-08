import { supabase } from '$lib/supabase';

async function requireUser(): Promise<string> {
	const { data, error } = await supabase().auth.getUser();
	if (error || !data.user) throw new Error('Nicht eingeloggt');
	return data.user.id;
}

export type TradeStatus = 'angefragt' | 'angenommen' | 'abgelehnt' | 'abgebrochen' | 'abgeschlossen';

export interface Trade {
	id: number;
	proposer: string;
	responder: string;
	card_id: number | null;
	card_name: string;
	card_game: string | null;
	price: number | null;
	currency: string | null;
	message: string | null;
	status: TradeStatus;
	proposer_done: boolean;
	responder_done: boolean;
	created_at: string;
	updated_at: string;
	proposer_name: string | null;
	responder_name: string | null;
	i_am_proposer: boolean;
}

export async function listTrades(): Promise<Trade[]> {
	await requireUser();
	const { data, error } = await supabase().from('trades_view').select('*').order('updated_at', { ascending: false }).limit(200);
	if (error) throw new Error(error.message);
	return (data ?? []) as Trade[];
}

export async function createTrade(t: {
	responder: string; cardId: number; cardName: string; cardGame?: string | null; price?: number | null; currency?: string | null; message?: string | null;
}): Promise<void> {
	const me = await requireUser();
	const row = { proposer: me, responder: t.responder, card_id: t.cardId, card_name: t.cardName, card_game: t.cardGame ?? null, price: t.price ?? null, currency: t.currency || 'EUR', message: t.message ?? null };
	const { error } = await supabase().from('trades').insert(row);
	if (error) throw new Error(error.message);
}

export async function updateTrade(id: number, fields: { status?: TradeStatus; proposer_done?: boolean; responder_done?: boolean; price?: number }): Promise<void> {
	const patch: Record<string, unknown> = {};
	for (const k of ['status', 'proposer_done', 'responder_done', 'price'] as const) { if (fields[k] !== undefined) patch[k] = fields[k]; }
	const { error } = await supabase().from('trades').update(patch).eq('id', id);
	if (error) throw new Error(error.message);
}

export async function openTradesCount(): Promise<number> {
	const me = await requireUser();
	const { count, error } = await supabase().from('trades').select('id', { count: 'exact', head: true }).eq('responder', me).eq('status', 'angefragt');
	if (error) throw new Error(error.message);
	return count ?? 0;
}

// --- Bewertungen (trade_feedback) ---
export interface FeedbackInput {
	stars: number;
	recommend: boolean;
	comment?: string | null;
	catKommunikation?: number | null;
	catVerpackung?: number | null;
	catVersand?: number | null;
	catZustand?: number | null;
}

export async function giveFeedback(tradeId: number, rated: string, f: FeedbackInput): Promise<void> {
	const me = await requireUser();
	const row = {
		trade_id: tradeId, rater: me, rated,
		recommend: f.recommend, stars: f.stars, comment: f.comment ?? null,
		cat_kommunikation: f.catKommunikation ?? null, cat_verpackung: f.catVerpackung ?? null,
		cat_versand: f.catVersand ?? null, cat_zustand: f.catZustand ?? null
	};
	const { error } = await supabase().from('trade_feedback').upsert(row, { onConflict: 'trade_id,rater' });
	if (error) throw new Error(error.message);
}

export async function myRatedTradeIds(): Promise<number[]> {
	const me = await requireUser();
	const { data, error } = await supabase().from('trade_feedback').select('trade_id').eq('rater', me);
	if (error) throw new Error(error.message);
	return (data ?? []).map((r) => (r as { trade_id: number }).trade_id);
}
