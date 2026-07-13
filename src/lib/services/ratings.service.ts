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

// Nutzer-Bewertung (1-5 Sterne + Kommentar), unabhaengig vom Trade-Feedback.
export interface UserRating {
	rated: string;
	rater: string;
	stars: number;
	comment: string | null;
	created_at: string;
	rater_name: string | null;
	is_mine: boolean;
}

// Alle Bewertungen eines Nutzers (neueste zuerst).
export async function listRatings(userId: string): Promise<UserRating[]> {
	return ok(
		await supabase()
			.from('ratings_view')
			.select('rated, rater, stars, comment, created_at, rater_name, is_mine')
			.eq('rated', userId)
			.order('created_at', { ascending: false })
	);
}

// Einen anderen Nutzer bewerten (oder die eigene Bewertung aendern). 1x pro Paar.
export async function rateUser(ratedUserId: string, stars: number, comment: string | null): Promise<void> {
	const uid = await requireUser();
	if (uid === ratedUserId) throw new Error('Du kannst dich nicht selbst bewerten.');
	const s = Math.max(1, Math.min(5, Math.round(stars)));
	const { error } = await supabase()
		.from('user_ratings')
		.upsert({ rater: uid, rated: ratedUserId, stars: s, comment: comment?.trim() || null }, { onConflict: 'rater,rated' });
	if (error) throw new Error(error.message);
}

// Eigene Bewertung eines Nutzers loeschen.
export async function deleteRating(ratedUserId: string): Promise<void> {
	const uid = await requireUser();
	const { error } = await supabase().from('user_ratings').delete().eq('rater', uid).eq('rated', ratedUserId);
	if (error) throw new Error(error.message);
}
