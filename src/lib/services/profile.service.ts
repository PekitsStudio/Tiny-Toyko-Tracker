import { supabase } from '$lib/supabase';

async function requireUser(): Promise<string> {
	const { data, error } = await supabase().auth.getUser();
	if (error || !data.user) throw new Error('Nicht eingeloggt');
	return data.user.id;
}

export interface Profile { display_name: string | null; country: string | null; contact: string | null; bio: string | null; fav_games: string | null; collector_type: string | null; }
export async function getMyProfile(): Promise<Profile> {
	const uid = await requireUser();
	const { data, error } = await supabase().from('user_settings').select('display_name, country, contact, bio, fav_games, collector_type').eq('user_id', uid).maybeSingle();
	if (error) throw new Error(error.message);
	return (data ?? { display_name: null, country: null, contact: null, bio: null, fav_games: null, collector_type: null }) as Profile;
}
export type ProfilePatch = { country?: string | null; contact?: string | null; bio?: string | null; fav_games?: string | null; collector_type?: string | null };
export async function updateMyProfile(fields: ProfilePatch): Promise<void> {
	const uid = await requireUser();
	const row: Record<string, unknown> = { user_id: uid };
	for (const k of ['country', 'contact', 'bio', 'fav_games', 'collector_type'] as const) { if (fields[k] !== undefined) row[k] = fields[k]; }
	const { error } = await supabase().from('user_settings').upsert(row, { onConflict: 'user_id' });
	if (error) throw new Error(error.message);
}

export interface PublicProfile {
	user_id: string; name: string | null; country: string | null; contact: string | null; bio: string | null;
	fav_games: string | null; collector_type: string | null; points: number | null; rank: number | null;
	badges: string[] | null; active_offers: number | null; sold_count: number | null; total_cards: number | null; member_since: string | null;
	fb_count: number | null; fb_pos: number | null; fb_avg: number | null; fb_recommend_pct: number | null;
	rating_avg: number | null; rating_count: number | null;
}
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
	const { data, error } = await supabase().from('profiles')
		.select('user_id, name, country, contact, bio, fav_games, collector_type, points, rank, badges, active_offers, sold_count, total_cards, member_since, fb_count, fb_pos, fb_avg, fb_recommend_pct, rating_avg, rating_count')
		.eq('user_id', userId).maybeSingle();
	if (error) throw new Error(error.message);
	return (data ?? null) as PublicProfile | null;
}

export interface FeedbackEntry {
	trade_id: number; rater: string; recommend: boolean; stars: number; comment: string | null;
	created_at: string; rater_name: string | null; card_name: string | null;
}
export async function getUserFeedback(userId: string): Promise<FeedbackEntry[]> {
	const { data, error } = await supabase().from('feedback_view')
		.select('trade_id, rater, recommend, stars, comment, created_at, rater_name, card_name')
		.eq('rated', userId).order('created_at', { ascending: false }).limit(10);
	if (error) throw new Error(error.message);
	return (data ?? []) as FeedbackEntry[];
}
