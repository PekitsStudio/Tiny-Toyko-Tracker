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

// Kommentare zu einer konkreten Karte (spielweit ueber game + external_id).
export interface CardComment {
	id: number;
	user_id: string;
	author_name: string | null;
	author_country: string | null;
	body: string;
	created_at: string;
}

export async function listCardComments(game: string, externalId: string): Promise<CardComment[]> {
	return ok(
		await supabase()
			.from('card_comments')
			.select('id, user_id, author_name, author_country, body, created_at')
			.eq('game', game)
			.eq('external_id', externalId)
			.order('created_at', { ascending: true })
	);
}

export async function addCardComment(game: string, externalId: string, body: string): Promise<void> {
	const uid = await requireUser();
	const text = body.trim();
	if (!text) return;
	const { error } = await supabase().from('card_comments').insert({ user_id: uid, game, external_id: externalId, body: text });
	if (error) throw new Error(error.message);
}

export async function deleteCardComment(id: number): Promise<void> {
	await requireUser();
	const { error } = await supabase().from('card_comments').delete().eq('id', id);
	if (error) throw new Error(error.message);
}
