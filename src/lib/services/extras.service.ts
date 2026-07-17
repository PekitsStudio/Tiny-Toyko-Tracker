import { supabase } from '$lib/supabase';

async function requireUser(): Promise<string> {
	const { data, error } = await supabase().auth.getUser();
	if (error || !data.user) throw new Error('Nicht eingeloggt');
	return data.user.id;
}
function ok<T>(res: { data: T | null; error: { message?: string } | null }): T {
	if (res.error) throw new Error(res.error.message || 'Datenbankfehler');
	return res.data as T;
}

// --- Versiegelte Produkte (sealed) ---
export interface SealedItem {
	id: number; game: string; set_name: string | null; product_type: string; name: string;
	image_url: string | null; quantity: number; purchase_price: number | null;
	current_value: number | null; currency: string | null; notes: string | null;
}
export async function listSealed(): Promise<SealedItem[]> {
	await requireUser();
	return ok(await supabase().from('sealed')
		.select('id, game, set_name, product_type, name, image_url, quantity, purchase_price, current_value, currency, notes')
		.eq('status', 'owned').order('added_at', { ascending: false }));
}
export async function addSealed(s: {
	name: string; game: string; product_type: string; set_name?: string | null;
	quantity?: number; purchase_price?: number | null; current_value?: number | null; currency?: string;
}): Promise<void> {
	const uid = await requireUser();
	const { error } = await supabase().from('sealed').insert({
		user_id: uid, name: s.name, game: s.game, product_type: s.product_type, set_name: s.set_name ?? null,
		quantity: s.quantity ?? 1, purchase_price: s.purchase_price ?? null, current_value: s.current_value ?? null,
		currency: s.currency || 'EUR', status: 'owned'
	});
	if (error) throw new Error(error.message);
}
export async function deleteSealed(id: number): Promise<void> {
	await requireUser();
	const { error } = await supabase().from('sealed').delete().eq('id', id);
	if (error) throw new Error(error.message);
}
// Versiegeltes Produkt als verkauft markieren -> wandert in den Reiter "Verkauft".
export async function sellSealed(id: number, soldPrice: number | null, soldDate?: string): Promise<void> {
	await requireUser();
	const day = soldDate || new Date().toISOString().slice(0, 10);
	const { error } = await supabase().from('sealed').update({ status: 'sold', sold_price: soldPrice, sold_date: day }).eq('id', id);
	if (error) throw new Error(error.message);
}
export async function unsellSealed(id: number): Promise<void> {
	await requireUser();
	const { error } = await supabase().from('sealed').update({ status: 'owned', sold_price: null, sold_date: null }).eq('id', id);
	if (error) throw new Error(error.message);
}
export interface SoldSealed {
	id: number; game: string; name: string; set_name: string | null; product_type: string;
	quantity: number; currency: string | null; purchase_price: number | null; sold_price: number | null; sold_date: string | null;
}
export async function listSoldSealed(): Promise<SoldSealed[]> {
	await requireUser();
	return ok(await supabase().from('sealed')
		.select('id, game, name, set_name, product_type, quantity, currency, purchase_price, sold_price, sold_date')
		.eq('status', 'sold').order('sold_date', { ascending: false, nullsFirst: false }));
}

export type SealedPatch = Partial<{
	name: string; game: string; product_type: string; set_name: string | null;
	quantity: number; purchase_price: number | null; current_value: number | null;
}>;
export async function updateSealed(id: number, patch: SealedPatch): Promise<void> {
	await requireUser();
	const allowed = ['name', 'game', 'product_type', 'set_name', 'quantity', 'purchase_price', 'current_value'] as const;
	const row: Record<string, unknown> = {};
	for (const k of allowed) if (patch[k] !== undefined) row[k] = patch[k];
	if (!Object.keys(row).length) return;
	const { error } = await supabase().from('sealed').update(row).eq('id', id);
	if (error) throw new Error(error.message);
}

// --- Gegradete Karten (graded_cards) ---
export interface GradedCard {
	id: number; name: string; set_name: string | null; number: string | null; image_url: string | null;
	company: string; grade: string; cert: string | null; value: number | null; currency: string | null;
	purchase_price: number | null; notes: string | null;
}
export async function listGraded(): Promise<GradedCard[]> {
	await requireUser();
	return ok(await supabase().from('graded_cards')
		.select('id, name, set_name, number, image_url, company, grade, cert, value, currency, purchase_price, notes')
		.eq('status', 'owned').order('added_at', { ascending: false }));
}
export async function addGraded(g: {
	name: string; company: string; grade: string; set_name?: string | null; number?: string | null;
	cert?: string | null; value?: number | null; purchase_price?: number | null; currency?: string;
}): Promise<void> {
	const uid = await requireUser();
	const { error } = await supabase().from('graded_cards').insert({
		user_id: uid, name: g.name, company: g.company, grade: g.grade, set_name: g.set_name ?? null,
		number: g.number ?? null, cert: g.cert ?? null, value: g.value ?? null, purchase_price: g.purchase_price ?? null,
		currency: g.currency || 'USD', status: 'owned'
	});
	if (error) throw new Error(error.message);
}
export async function deleteGraded(id: number): Promise<void> {
	await requireUser();
	const { error } = await supabase().from('graded_cards').delete().eq('id', id);
	if (error) throw new Error(error.message);
}
export type GradedPatch = Partial<{
	name: string; set_name: string | null; number: string | null; company: string;
	grade: string; cert: string | null; value: number | null; purchase_price: number | null;
}>;
export async function updateGraded(id: number, patch: GradedPatch): Promise<void> {
	await requireUser();
	const allowed = ['name', 'set_name', 'number', 'company', 'grade', 'cert', 'value', 'purchase_price'] as const;
	const row: Record<string, unknown> = {};
	for (const k of allowed) if (patch[k] !== undefined) row[k] = patch[k];
	if (!Object.keys(row).length) return;
	const { error } = await supabase().from('graded_cards').update(row).eq('id', id);
	if (error) throw new Error(error.message);
}
