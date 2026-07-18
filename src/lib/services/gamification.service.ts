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
	id: string; cat: string; name: string; icon: string; desc: string;
	value: number; tiers: number[]; tierLabels: string[];
	reached: number; // Index der hoechsten erreichten Stufe (-1 = keine)
	nextThreshold: number | null; done: boolean; money?: boolean;
	cp: number; rarity: string; claimId: string; claimed: boolean; claimable: boolean;
}
export interface Progress {
	xp: number; level: number; into: number; need: number; cp: number;
	streak: number; bestStreak: number; path: string | null;
	achievements: Achievement[]; earned: number; total: number;
	badges: string[]; title: string;
}

const TIER_NAMES = ['Bronze', 'Silber', 'Gold', 'Diamant', 'Meister', 'Legendär'];
const RARITY = ['bronze', 'silber', 'gold', 'diamant', 'legend'];

function ach(id: string, cat: string, name: string, icon: string, desc: string, value: number, tiers: number[], cp: number, money = false): Achievement {
	let reached = -1;
	for (let i = 0; i < tiers.length; i++) if (value >= tiers[i]) reached = i;
	const rarity = reached < 0 ? 'locked' : (tiers.length === 1 ? 'gold' : (RARITY[Math.min(reached, RARITY.length - 1)] ?? 'gold'));
	return {
		id, cat, name, icon, desc, value, tiers,
		tierLabels: tiers.map((_, i) => (tiers.length === 1 ? '' : TIER_NAMES[i] ?? `Stufe ${i + 1}`)),
		reached, nextThreshold: reached + 1 < tiers.length ? tiers[reached + 1] : null,
		done: reached === tiers.length - 1, money,
		cp, rarity, claimId: '', claimed: false, claimable: false
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
	let xp = 0; let path: string | null = null; let streak = 0; let bestStreak = 0; let cp = 0; let claimed: string[] = [];
	try {
		const p = await supabase().from('profiles').select('points').eq('user_id', id).maybeSingle();
		xp = Number((p.data as { points: number | null } | null)?.points ?? 0);
	} catch { xp = 0; }
	try {
		const us = await supabase().from('user_settings').select('streak, best_streak, collector_path, cp, claimed_quests').eq('user_id', id).maybeSingle();
		streak = us.data?.streak ?? 0; bestStreak = us.data?.best_streak ?? 0; path = (us.data?.collector_path as string | null) ?? null;
		cp = us.data?.cp ?? 0; claimed = (us.data?.claimed_quests as string[] | null) ?? [];
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
		ach('cards', 'Sammlung', 'Sammler', '🃏', 'Besitze möglichst viele Karten.', ownedQty, [100, 500, 1000, 5000], 50),
		ach('value', 'Wert', 'Sammlungswert', '💶', 'Steigere den Gesamtwert deiner Sammlung.', value, [100, 500, 1000, 5000, 10000, 50000], 80, true),
		ach('sold', 'Verkäufer', 'Verkäufer', '🏷️', 'Verkaufe Karten aus deiner Sammlung.', soldQty, [1, 10, 100, 1000], 60),
		ach('trades', 'Handel', 'Händler', '🔄', 'Schließe Trades mit anderen Sammlern ab.', trades, [1, 10, 100], 80),
		ach('guide', 'Community', 'Guide-Autor', '📚', 'Veröffentliche einen Guide.', guides, [1], 50),
		ach('pull', 'Community', 'Pull-Poster', '🎉', 'Teile deine Pulls mit der Community.', pulls, [1], 30),
		ach('review', 'Community', 'Rezensent', '⭐', 'Schreibe eine Review.', reviews, [1], 40),
		ach('showcase', 'Community', 'Aussteller', '🖼️', 'Erstelle eine öffentliche Sammlung.', showcases, [1], 50),
		ach('comment', 'Community', 'Kommentator', '💬', 'Kommentiere Karten und Beiträge.', comments, [1, 25, 100], 40),
		ach('forum', 'Community', 'Forum-Aktiv', '🗣️', 'Schreibe Beiträge im Forum.', forumPosts, [1, 25], 40),
		ach('likes', 'Community', 'Beliebt', '❤️', 'Sammle Likes auf deinen Inhalten.', likes, [10, 100, 500], 50),
		ach('friends', 'Social', 'Vernetzt', '👥', 'Finde neue Sammler-Freunde.', friendCount, [1, 5, 25], 30),
		ach('alerts', 'Preisjäger', 'Preisjäger', '🔔', 'Erstelle Preisalarme für Karten.', alertsAll, [1, 100], 40),
		ach('alertsHit', 'Preisjäger', 'Spürnase', '🎯', 'Lass Preisalarme auslösen.', alertsHit, [1, 50], 50),
		ach('streak', 'Streak', 'Daily Streak', '🔥', 'Logge dich an vielen Tagen in Folge ein.', bestStreak, [3, 7, 30, 100, 365], 40),
		ach('lucky', 'Selten', 'Lucky Pull', '🎲', 'Besitze eine Karte im Wert von über 100 €.', maxCard, [100], 150, true),
		ach('bigsale', 'Selten', 'Big Sale', '💰', 'Verkaufe eine Karte für über 500 €.', maxSold, [500], 200, true),
		ach('warehouse', 'Selten', 'Warehouse', '📦', 'Besitze 1000 versiegelte Produkte.', sealedQty, [1000], 200),
		ach('world', 'Selten', 'World Collector', '🌍', 'Besitze Karten in 20 verschiedenen Sprachen.', langs, [5, 10, 20], 60),
		ach('millionaire', 'Selten', 'Millionär', '🏦', 'Erreiche 1.000.000 € Sammlungswert.', value, [1000000], 1000, true)
	];
	for (const a of list) {
		a.claimId = `ach:${a.id}:${a.reached}`;
		a.claimed = a.reached >= 0 && claimed.includes(a.claimId);
		a.claimable = a.reached >= 0 && !a.claimed;
	}

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
		xp, level: lv.level, into: lv.into, need: lv.need, cp,
		streak, bestStreak, path,
		achievements: list, earned, total: list.length,
		badges, title: badges[0] ?? ''
	};
}

// Belohnung eines erreichten Achievements einloesen (einmalig pro Stufe).
export async function claimAchievement(claimId: string, cp: number): Promise<number> {
	const id = await uidOrNull();
	if (!id) throw new Error('Nicht eingeloggt');
	const us = await supabase().from('user_settings').select('cp, claimed_quests').eq('user_id', id).maybeSingle();
	let bal = us.data?.cp ?? 0;
	let claimed = (us.data?.claimed_quests as string[] | null) ?? [];
	if (claimed.includes(claimId)) return bal;
	bal += cp;
	// Achievement-Eintraege bleiben dauerhaft, Quest-Eintraege werden begrenzt.
	claimed = [...claimed, claimId];
	claimed = [...claimed.filter((x) => x.startsWith('ach:')), ...claimed.filter((x) => !x.startsWith('ach:')).slice(-80)];
	const { error } = await supabase().from('user_settings').upsert({ user_id: id, cp: bal, claimed_quests: claimed }, { onConflict: 'user_id' });
	if (error) throw new Error(error.message);
	return bal;
}

// Nur Level (guenstig) – fuer Dashboard etc.
export async function getLevel(): Promise<{ level: number; into: number; need: number; xp: number }> {
	const id = await uidOrNull();
	if (!id) return { level: 1, into: 0, need: 50, xp: 0 };
	let xp = 0;
	try { const p = await supabase().from('profiles').select('points').eq('user_id', id).maybeSingle(); xp = Number((p.data as { points: number | null } | null)?.points ?? 0); } catch { xp = 0; }
	return { ...levelFromXp(xp), xp };
}
