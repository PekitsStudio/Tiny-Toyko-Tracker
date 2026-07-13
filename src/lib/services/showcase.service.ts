import { supabase } from '$lib/supabase';
import type { CollectionCard } from '$lib/services/collection.service';

async function requireUser(): Promise<string> {
	const { data, error } = await supabase().auth.getUser();
	if (error || !data.user) throw new Error('Nicht eingeloggt');
	return data.user.id;
}
function ok<T>(res: { data: T | null; error: { message?: string } | null }): T {
	if (res.error) throw new Error(res.error.message || 'Datenbankfehler');
	return res.data as T;
}

export type Visibility = 'private' | 'unlisted' | 'public';

export type ReactionKind = 'like' | 'fire' | 'gem' | 'save';

export interface Showcase {
	id: number; user_id: string; author_name: string | null; author_country: string | null;
	name: string; description: string | null; created_at: string | null;
	visibility: Visibility; game: string | null; cover: string | null; card_count: number;
	like_count: number; fire_count: number; gem_count: number; save_count: number;
	comment_count: number; follower_count: number;
	followed: boolean; is_mine: boolean; my_reactions: string[] | null;
}
export interface ShowcaseCard {
	id: number; game: string; name: string; set_name: string | null; number: string | null;
	rarity: string | null; image_url: string | null; language: string | null; position: number;
}

export async function listMyShowcases(): Promise<Showcase[]> {
	const uid = await requireUser();
	return ok(await supabase().from('collections_view').select('*').eq('user_id', uid).order('updated_at', { ascending: false }));
}
export async function discoverShowcases(): Promise<Showcase[]> {
	await requireUser();
	return ok(await supabase().from('collections_view').select('*').eq('visibility', 'public').order('last_activity', { ascending: false }).limit(60));
}
export async function getShowcaseCards(id: number): Promise<ShowcaseCard[]> {
	return ok(await supabase().from('collection_cards').select('id, game, name, set_name, number, rarity, image_url, language, position').eq('collection_id', id).order('position', { ascending: true }).order('id', { ascending: true }));
}
export async function createShowcase(c: { name: string; description?: string | null; visibility?: Visibility; game?: string | null }): Promise<Showcase> {
	const uid = await requireUser();
	const { data, error } = await supabase().from('collections').insert({
		user_id: uid, name: c.name, description: c.description || null, visibility: c.visibility || 'private', game: c.game || null
	}).select().single();
	if (error) throw new Error(error.message);
	return data as Showcase;
}
export async function updateShowcase(id: number, patch: { name?: string; description?: string | null; visibility?: Visibility; game?: string | null }): Promise<void> {
	const allowed: Record<string, unknown> = {};
	for (const k of ['name', 'description', 'visibility', 'game'] as const) if (patch[k] !== undefined) allowed[k] = patch[k];
	allowed.updated_at = new Date().toISOString();
	const { error } = await supabase().from('collections').update(allowed).eq('id', id);
	if (error) throw new Error(error.message);
}
export async function deleteShowcase(id: number): Promise<void> {
	const { error } = await supabase().from('collections').delete().eq('id', id);
	if (error) throw new Error(error.message);
}
export async function addCardsToShowcase(collectionId: number, cards: CollectionCard[]): Promise<void> {
	const uid = await requireUser();
	const rows = cards.map((c) => ({
		collection_id: collectionId, user_id: uid, game: c.game, name: c.name,
		set_name: c.set_name, number: c.number, rarity: c.rarity, image_url: c.image_url, language: c.language
	}));
	if (!rows.length) return;
	const { error } = await supabase().from('collection_cards').insert(rows);
	if (error) throw new Error(error.message);
}
export async function removeShowcaseCard(rowId: number): Promise<void> {
	const { error } = await supabase().from('collection_cards').delete().eq('id', rowId);
	if (error) throw new Error(error.message);
}
// Reaktion umschalten (like / fire / gem / save). active = ist aktuell gesetzt.
export async function toggleReaction(collectionId: number, kind: ReactionKind, active: boolean): Promise<void> {
	const uid = await requireUser();
	if (active) {
		const { error } = await supabase().from('collection_reactions').delete().eq('collection_id', collectionId).eq('user_id', uid).eq('kind', kind);
		if (error) throw new Error(error.message);
	} else {
		const { error } = await supabase().from('collection_reactions').insert({ collection_id: collectionId, user_id: uid, kind });
		if (error) throw new Error(error.message);
	}
}
// Rueckwaertskompatibel: Like ist nur eine spezielle Reaktion.
export async function toggleLike(collectionId: number, active: boolean): Promise<void> {
	return toggleReaction(collectionId, 'like', active);
}

// --- Einer Sammlung folgen (collection_followers) ---
export async function toggleFollow(collectionId: number, active: boolean): Promise<void> {
	const uid = await requireUser();
	if (active) {
		const { error } = await supabase().from('collection_followers').delete().eq('collection_id', collectionId).eq('user_id', uid);
		if (error) throw new Error(error.message);
	} else {
		const { error } = await supabase().from('collection_followers').insert({ collection_id: collectionId, user_id: uid });
		if (error) throw new Error(error.message);
	}
}

// --- Kommentare zu einer Sammlung (collection_comments) ---
export interface ShowcaseComment {
	id: number; user_id: string; author_name: string | null; author_country: string | null;
	body: string; created_at: string;
}
export async function listShowcaseComments(collectionId: number): Promise<ShowcaseComment[]> {
	return ok(await supabase().from('collection_comments')
		.select('id, user_id, author_name, author_country, body, created_at')
		.eq('collection_id', collectionId).order('created_at', { ascending: true }));
}
export async function addShowcaseComment(collectionId: number, body: string): Promise<void> {
	const uid = await requireUser();
	const text = body.trim();
	if (!text) return;
	const { error } = await supabase().from('collection_comments').insert({ collection_id: collectionId, user_id: uid, body: text });
	if (error) throw new Error(error.message);
}
export async function deleteShowcaseComment(id: number): Promise<void> {
	await requireUser();
	const { error } = await supabase().from('collection_comments').delete().eq('id', id);
	if (error) throw new Error(error.message);
}
