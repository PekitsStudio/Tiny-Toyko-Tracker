import { supabase } from '$lib/supabase';
import { Adapters } from '$lib/adapters/tcg-adapters.js';

async function requireUser(): Promise<string> {
	const { data, error } = await supabase().auth.getUser();
	if (error || !data.user) throw new Error('Nicht eingeloggt');
	return data.user.id;
}
function ok<T>(res: { data: T | null; error: { message?: string } | null }): T {
	if (res.error) throw new Error(res.error.message || 'Datenbankfehler');
	return res.data as T;
}
const PriceEngine = Adapters as unknown as {
	fetchPrices: (game: string, externalId: string, opts?: { lang?: string }) => Promise<{ price: number | null }>;
};

export type Direction = 'below' | 'above';
export interface PriceAlert {
	id: number; game: string; external_id: string | null; name: string; set_name: string | null;
	image_url: string | null; language: string | null; currency: string | null;
	target_price: number; direction: Direction; last_price: number | null; triggered: boolean; created_at: string;
}

export async function listAlerts(): Promise<PriceAlert[]> {
	await requireUser();
	return ok(await supabase().from('price_alerts').select('*').order('created_at', { ascending: false }));
}

export async function addAlert(a: {
	game: string; externalId?: string | null; name: string; setName?: string | null; imageUrl?: string | null;
	language?: string | null; currency?: string | null; targetPrice: number; direction: Direction;
}): Promise<void> {
	const uid = await requireUser();
	const { error } = await supabase().from('price_alerts').insert({
		user_id: uid, game: a.game, external_id: a.externalId ?? null, name: a.name, set_name: a.setName ?? null,
		image_url: a.imageUrl ?? null, language: a.language ?? null, currency: a.currency ?? 'EUR',
		target_price: a.targetPrice, direction: a.direction
	});
	if (error) throw new Error(error.message);
}

export async function deleteAlert(id: number): Promise<void> {
	await requireUser();
	const { error } = await supabase().from('price_alerts').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

// Aktuelle Preise holen und Alarme auswerten.
export async function checkAlerts(onProgress?: (done: number, total: number) => void): Promise<{ checked: number; triggered: number }> {
	await requireUser();
	const alerts = await listAlerts();
	let triggered = 0; let done = 0;
	for (const a of alerts) {
		if (!a.external_id) { done++; onProgress?.(done, alerts.length); continue; }
		try {
			const p = await PriceEngine.fetchPrices(a.game, a.external_id, { lang: a.language ? a.language.toLowerCase() : undefined });
			const price = p?.price ?? null;
			const hit = price != null && (a.direction === 'below' ? price <= a.target_price : price >= a.target_price);
			await supabase().from('price_alerts').update({ last_price: price, triggered: hit }).eq('id', a.id);
			if (hit) triggered++;
		} catch { /* einzelne Fehler ignorieren */ }
		done++; onProgress?.(done, alerts.length);
	}
	return { checked: alerts.length, triggered };
}
