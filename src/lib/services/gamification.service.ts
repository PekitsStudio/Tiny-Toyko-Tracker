import { supabase } from '$lib/supabase';
import { listCards, listSold } from '$lib/services/collection.service';
import { listSealed } from '$lib/services/extras.service';
import { listFriends } from '$lib/services/social.service';

// --- Level-Kurve (XP = die vorhandene Aktivitaets-Punktzahl aus der profiles-View) ---
export function levelFromXp(xp: number): { level: number; into: number; need: number } {
	let lvl = 1, base = 0;
	while (lvl < 100) {
		const need = 50 * lvl;
		if (xp < base + need) break;
		base += need; lvl++;
	}
	return { level: lvl, into: Math.max(0, Math.round(xp - base)), need: 50 * lvl };
}

async function uidOrNull(): Promise<string | null> {
	const { data } = await supabase().auth.getUser();
	return data.user?.id ?? null;
}

// --- Login-Streak: einmal pro Tag hochzaehlen ---
export async function touchLogin(): Promise<void> {
	const id = await uidOrNull();
	if (!id) return;
	const { data } = await supabase().from('user_settings').select('last_login, streak, best_streak').eq('user_id', id).maybeSingle();
	const today = new Date().toISOString().slice(0, 10);
	const last = (data?.last_login as string | null) ?? null;
	if (last === today) return;
	const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
	const streak = last === yesterday ? (data?.streak ?? 0) + 1 : 1;
	const best = Math.max(data?.best_streak ?? 0, streak);
	await supabase().from('user_settings').upsert({ user_id: id, last_login: today, streak, best_streak: best }, { onConflict: 'user_id' });
}

export const COLLECTOR_PATHS: { key: string; label: string; icon: string }[] = [
	{ key: 'pokemon', label: 'Pokémon-Professor', icon: '🔴' },
	{ key: 'magic', label: 'Magic-Archivar', icon: '🔵' },
	{ key: 'onepiece', label: 'One-Piece-Pirat', icon: '🏴‍☠️' },
	{ key: 'market', label: 'Markthändler', icon: '💰' },
	{ key: 'community', label: 'Community-Legende', icon: '🌟' }
];

export async function setCollectorPath(path: string): Promise<void> {
	const id = await uidOrNull();
	if (!id) throw new Error('Nicht eingeloggt');
	const { error } = await supabase().from('user_settings').upsert({ user_id: id, collector_path: path || null }, { onConflict: 'user_id' });
	if (error) throw new Error(error.message);
}

// --- Achievements ---
export interface Achievement {
	id: string; cat: string; name: string; icon: string;
	value: number; tiers: number[]; tierLabels: string[];
	reached: number; // Index der hoechsten erreichten Stufe (-1 = keine)
	nextThreshold: number | null; done: boolean; money?: boolean;
}
export interface Progress {
	xp: number; level: number; into: number; need: number;
	streak: number; bestStreak: number; path: string | null;
	achievements: Achievement[]; earned: number; total: number;
	badges: string[]; title: string;
}

const TIER_NAMES = ['Bronze', 'Silber', 'Gold', 'Diamant', 'Meister', 'Legendär'];

function ach(id: string, cat: string, name: string, icon: string, value: number, tiers: number[], money = false): Achievement {
	let reached = -1;
	for (let i = 0; i < tiers.length; i++) if (value >= tiers[i]) reached = i;
	return {
		id, cat, name, icon, value, tiers,
		tierLabels: tiers.map((_, i) => (tiers.length === 1 ? '' : TIER_NAMES[i] ?? `Stufe ${i + 1}`)),
		reached, nextThreshold: reached + 1 < tiers.length ? tiers[reached + 1] : null,
		done: reached === tiers.length - 1, money
	};
}

// Zaehlt Zeilen ueber head+count (guenstig). q ist eine fertige Supabase-Query.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function headCount(q: any): Promise<number> {
	try { const { count } = await q; return (count as number | null) ?? 0; } catch { return 0; }
}

export async function getProgress(): Promise<Progress> {
	const id = await uidOrNull();
	if (!id) throw new Error('Nicht eingeloggt');

	// Aktivitaets-Punkte als XP (bereits serverseitig berechnet, fuer alle konsistent)
	let xp = 0; let path: string | null = null; let streak = 0; let bestStreak = 0;
	try {
		const p = await supabase().from('profiles').select('points').eq('user_id', id).maybeSingle();
		xp = Number((p.data as { points: number | null } | null)?.points ?? 0);
	} catch { xp = 0; }
	try {
		const us = await supabase().from('user_settings').select('streak, best_streak, collector_path').eq('user_id', id).maybeSingle();
		streak = us.data?.streak ?? 0; bestStreak = us.data?.best_streak ?? 0; path = (us.data?.collector_path as string | null) ?? null;
	} catch { /* egal */ }

	const [cards, sold, sealed, friends] = await Promise.all([listCards(), listSold(), listSealed(), listFriends().catch(() => [])]);

	const ownedQty = cards.reduce((s, c) => s + (c.quantity ?? 1), 0);
	const value = cards.reduce((s, c) => s + (c.price_current ?? 0) * (c.quantity ?? 1), 0);
	const maxCard = cards.reduce((m, c) => Math.max(m, c.price_current ?? 0), 0);
	const langs = new Set(cards.map((c) => (c.language ?? '').toUpperCase()).filter(Boolean)).size;
	const sealedQty = sealed.reduce((s, x) => s + (x.quantity ?? 1), 0);
	const soldQty = sold.reduce((s, x) => s + (x.quantity ?? 1), 0);
	const maxSold = sold.reduce((m, x) => Math.max(m, x.sold_price ?? 0), 0);
	const friendCount = (friends as { status: string }[]).filter((f) => f.status === 'accepted').length;

	const sb = supabase();
	const C = (t: string) => sb.from(t).select('*', { count: 'exact', head: true });
	const [trades, guides, pulls, reviews, showcases, forumPosts, alertsAll, alertsHit, cardComm, postComm] = await Promise.all([
		headCount(C('trades').or(`proposer.eq.${id},responder.eq.${id}`).eq('status', 'abgeschlossen')),
		headCount(C('community_posts').eq('user_id', id).eq('kind', 'guide')),
		headCount(C('community_posts').eq('user_id', id).eq('kind', 'pulls')),
		headCount(C('community_posts').eq('user_id', id).eq('kind', 'review')),
		headCount(C('collections').eq('user_id', id)),
		headCount(C('forum_posts').eq('user_id', id)),
		headCount(C('price_alerts').eq('user_id', id)),
		headCount(C('price_alerts').eq('user_id', id).eq('triggered', true)),
		headCount(C('card_comments').eq('user_id', id)),
		headCount(C('community_post_comments').eq('user_id', id))
	]);
	const comments = cardComm + postComm;

	let likes = 0;
	try {
		const pv = await supabase().from('community_posts_view').select('like_count').eq('user_id', id);
		const cv = await supabase().from('collections_view').select('like_count').eq('user_id', id);
		likes = ((pv.data ?? []) as { like_count: number | null }[]).reduce((s, r) => s + (r.like_count ?? 0), 0)
			+ ((cv.data ?? []) as { like_count: number | null }[]).reduce((s, r) => s + (r.like_count ?? 0), 0);
	} catch { likes = 0; }

	const list: Achievement[] = [
		ach('cards', 'Sammlung', 'Sammler', '🃏', ownedQty, [100, 500, 1000, 5000]),
		ach('value', 'Wert', 'Sammlungswert', '💶', value, [100, 500, 1000, 5000, 10000, 50000], true),
		ach('sold', 'Verkäufer', 'Verkäufer', '🏷️', soldQty, [1, 10, 100, 1000]),
		ach('trades', 'Handel', 'Händler', '🔄', trades, [1, 10, 100]),
		ach('guide', 'Community', 'Guide-Autor', '📚', guides, [1]),
		ach('pull', 'Community', 'Pull gepostet', '🎉', pulls, [1]),
		ach('review', 'Community', 'Rezensent', '⭐', reviews, [1]),
		ach('showcase', 'Community', 'Showcase erstellt', '🖼️', showcases, [1]),
		ach('comment', 'Community', 'Kommentator', '💬', comments, [1, 25, 100]),
		ach('forum', 'Community', 'Forum-Aktiv', '🗣️', forumPosts, [1, 25]),
		ach('likes', 'Community', 'Beliebt', '❤️', likes, [10, 100, 500]),
		ach('friends', 'Social', 'Vernetzt', '👥', friendCount, [1, 5, 25]),
		ach('alerts', 'Preisjäger', 'Preisjäger', '🔔', alertsAll, [1, 100]),
		ach('alertsHit', 'Preisjäger', 'Spürnase', '🎯', alertsHit, [1, 50]),
		ach('streak', 'Streak', 'Daily Streak', '🔥', bestStreak, [3, 7, 30, 100, 365]),
		ach('lucky', 'Selten', 'Lucky Pull', '🎲', maxCard, [100], true),
		ach('bigsale', 'Selten', 'Big Sale', '💰', maxSold, [500], true),
		ach('warehouse', 'Selten', 'Warehouse', '📦', sealedQty, [1000]),
		ach('world', 'Selten', 'World Collector', '🌍', langs, [5, 10, 20]),
		ach('millionaire', 'Selten', 'Millionär', '🏦', value, [1000000], true)
	];

	// Badges/Titel aus erreichten Achievements ableiten (+ manuelle badges)
	const badges: string[] = [];
	const add = (b: string) => { if (!badges.includes(b)) badges.push(b); };
	const by = (id2: string) => list.find((a) => a.id === id2);
	if ((by('cards')?.reached ?? -1) >= 2) add('🏆 Master Collector');
	if ((by('value')?.reached ?? -1) >= 2) add('💎 Investor');
	if ((by('trades')?.reached ?? -1) >= 1) add('⚔️ Trader');
	if ((by('sold')?.reached ?? -1) >= 2) add('👑 Top Seller');
	if (by('guide')?.done) add('📚 Guide-Autor');
	if ((by('likes')?.reached ?? -1) >= 1) add('🌟 Community Hero');
	if (by('lucky')?.done) add('🎁 Lucky Puller');
	if ((by('streak')?.reached ?? -1) >= 1) add('🔥 Daily Streak');
	if (by('millionaire')?.done) add('🏦 Millionär');
	try {
		const pb = await supabase().from('profiles').select('badges').eq('user_id', id).maybeSingle();
		for (const b of ((pb.data as { badges: string[] | null } | null)?.badges ?? [])) if (b) add('🛡️ ' + b);
	} catch { /* egal */ }

	const lv = levelFromXp(xp);
	const earned = list.filter((a) => a.reached >= 0).length;

	return {
		xp, level: lv.level, into: lv.into, need: lv.need,
		streak, bestStreak, path,
		achievements: list, earned, total: list.length,
		badges, title: badges[0] ?? ''
	};
}
