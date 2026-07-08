import { supabase } from '$lib/supabase';

async function requireUser(): Promise<string> {
	const { data, error } = await supabase().auth.getUser();
	if (error || !data.user) throw new Error('Nicht eingeloggt');
	return data.user.id;
}

export interface Profile {
	display_name: string | null;
	country: string | null;
	contact: string | null;
	bio: string | null;
	fav_games: string | null;
	collector_type: string | null;
}

export async function getMyProfile(): Promise<Profile> {
	const uid = await requireUser();
	const { data, error } = await supabase()
		.from('user_settings')
		.select('display_name, country, contact, bio, fav_games, collector_type')
		.eq('user_id', uid)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data ?? {
		display_name: null, country: null, contact: null, bio: null, fav_games: null, collector_type: null
	}) as Profile;
}

// Anzeigename ist gesperrt und wird bewusst NICHT geaendert.
export type ProfilePatch = { country?: string | null; contact?: string | null; bio?: string | null; fav_games?: string | null; collector_type?: string | null };

export async function updateMyProfile(fields: ProfilePatch): Promise<void> {
	const uid = await requireUser();
	const row: Record<string, unknown> = { user_id: uid };
	for (const k of ['country', 'contact', 'bio', 'fav_games', 'collector_type'] as const) {
		if (fields[k] !== undefined) row[k] = fields[k];
	}
	const { error } = await supabase().from('user_settings').upsert(row, { onConflict: 'user_id' });
	if (error) throw new Error(error.message);
}
