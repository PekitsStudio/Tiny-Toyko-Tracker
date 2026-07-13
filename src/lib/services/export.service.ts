import { supabase } from '$lib/supabase';

async function requireUser(): Promise<string> {
	const { data, error } = await supabase().auth.getUser();
	if (error || !data.user) throw new Error('Nicht eingeloggt');
	return data.user.id;
}
function numOrNull(v: unknown): number | null { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; }

// Spaltenüberschrift -> DB-Feld (wie in der alten Version)
export const EXPORT_COLUMNS: [string, string][] = [
	['Spiel', 'game'], ['Name', 'name'], ['Set', 'set_name'], ['Set-Code', 'set_code'], ['Nummer', 'number'],
	['Seltenheit', 'rarity'], ['Anzahl', 'quantity'], ['Zustand', 'condition'], ['Sprache', 'language'],
	['Preis', 'price_current'], ['Ab-Preis', 'price_low'], ['Preistrend', 'price_trend'], ['Währung', 'currency'],
	['Kaufpreis', 'purchase_price'], ['Kaufdatum', 'purchase_date'], ['Status', 'status'],
	['Verkaufspreis', 'sold_price'], ['Verkaufsdatum', 'sold_date'], ['Notiz', 'notes'],
	['ExterneID', 'external_id'], ['BildURL', 'image_url'], ['CardmarketURL', 'cardmarket_url']
];

export async function fetchExportRows(): Promise<Record<string, unknown>[]> {
	await requireUser();
	const { data, error } = await supabase().from('cards').select('*').order('added_at', { ascending: false });
	if (error) throw new Error(error.message);
	return (data ?? []) as Record<string, unknown>[];
}

// CSV-Import: Objekte mit Feldnamen -> Karten anlegen. Gibt Anzahl importierter Karten zurück.
export async function importCards(items: Record<string, string>[]): Promise<number> {
	const user = await requireUser();
	const rows = items
		.filter((i) => (i.name || '').trim() && (i.game || '').trim())
		.map((i) => ({
			user_id: user, game: i.game.trim(), name: i.name.trim(), set_name: i.set_name || null, set_code: i.set_code || null,
			number: i.number || null, rarity: i.rarity || null, quantity: parseInt(i.quantity) || 1, condition: i.condition || 'NM',
			language: i.language || 'DE', price_current: numOrNull(i.price_current), price_low: numOrNull(i.price_low),
			price_trend: numOrNull(i.price_trend), currency: i.currency || 'EUR', purchase_price: numOrNull(i.purchase_price),
			purchase_date: i.purchase_date || null, status: i.status || 'owned', sold_price: numOrNull(i.sold_price),
			sold_date: i.sold_date || null, notes: i.notes || null, external_id: i.external_id || null,
			image_url: i.image_url || null, cardmarket_url: i.cardmarket_url || null
		}));
	if (!rows.length) return 0;
	for (let i = 0; i < rows.length; i += 500) {
		const { error } = await supabase().from('cards').insert(rows.slice(i, i + 500));
		if (error) throw new Error(error.message);
	}
	return rows.length;
}
