import { supabase } from '$lib/supabase';
import { listFriends } from '$lib/services/social.service';

async function requireUser(): Promise<string> {
	const { data, error } = await supabase().auth.getUser();
	if (error || !data.user) throw new Error('Nicht eingeloggt');
	return data.user.id;
}

export interface Mover {
	id: number; name: string; image_url: string | null; currency: string | null;
	change: number; pct: number; current: number;
}

export async function topMovers(): Promise<{ gainers: Mover[]; losers: Mover[] }> {
	await requireUser();
	const { data, error } = await supabase()
		.from('cards')
		.select('id, name, image_url, currency, price_at_add, price_current')
		.eq('status', 'owned');
	if (error) throw new Error(error.message);
	const rows = (data ?? []) as {
		id: number; name: string; image_url: string | null; currency: string | null;
		price_at_add: number | null; price_current: number | null;
	}[];
	const movers: Mover[] = rows
		.filter((r) => r.price_at_add != null && r.price_current != null && r.price_at_add > 0 && r.price_current !== r.price_at_add)
		.map((r) => ({
			id: r.id, name: r.name, image_url: r.image_url, currency: r.currency,
			change: (r.price_current as number) - (r.price_at_add as number),
			pct: (((r.price_current as number) - (r.price_at_add as number)) / (r.price_at_add as number)) * 100,
			current: r.price_current as number
		}));
	return {
		gainers: movers.filter((m) => m.change > 0).sort((a, b) => b.change - a.change).slice(0, 5),
		losers: movers.filter((m) => m.change < 0).sort((a, b) => a.change - b.change).slice(0, 5)
	};
}

// --- Aktivitäten von Freunden (Showcases + Beiträge) ---
export interface Activity { type: 'showcase' | 'post'; who: string; text: string; at: string; }
const KIND_LABEL: Record<string, string> = { pulls: 'Pull', guide: 'Guide', review: 'Review', showcase: 'Showcase' };

export async function friendsActivity(): Promise<Activity[]> {
	await requireUser();
	const friends = await listFriends();
	const ids = friends.filter((f) => f.status === 'accepted').map((f) => f.otherId);
	if (!ids.length) return [];
	const acts: Activity[] = [];

	const sc = await supabase().from('collections_view').select('name, author_name, last_activity, user_id').in('user_id', ids).order('last_activity', { ascending: false }).limit(20);
	for (const s of (sc.data ?? []) as { name: string; author_name: string | null; last_activity: string }[]) {
		acts.push({ type: 'showcase', who: s.author_name ?? 'Sammler', text: `Sammlung „${s.name}"`, at: s.last_activity });
	}
	const po = await supabase().from('community_posts_view').select('title, kind, author_name, created_at, user_id').in('user_id', ids).order('created_at', { ascending: false }).limit(20);
	for (const p of (po.data ?? []) as { title: string; kind: string; author_name: string | null; created_at: string }[]) {
		acts.push({ type: 'post', who: p.author_name ?? 'Sammler', text: `${KIND_LABEL[p.kind] ?? 'Beitrag'}: „${p.title}"`, at: p.created_at });
	}
	return acts.sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 10);
}
