import { supabase } from '$lib/supabase';

// --- Zeit-Helfer ---
function startOfDayISO(): string { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); }
function startOfWeek(): Date { const d = new Date(); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); d.setHours(0, 0, 0, 0); return d; }
function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function isoWeekId(): string {
	const d = new Date(); d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // Donnerstag dieser Woche
	const week1 = new Date(d.getFullYear(), 0, 4);
	const wk = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
	return `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`;
}

async function uidOrNull(): Promise<string | null> {
	const { data } = await supabase().auth.getUser();
	return data.user?.id ?? null;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hc(q: any): Promise<number> { try { const { count } = await q; return (count as number | null) ?? 0; } catch { return 0; } }

interface Ctx { uid: string; weekISO: string; weekDate: string; dayISO: string; today: string; lastLogin: string | null; }
interface Def { id: string; icon: string; text: string; target: number; cp: number; count: (c: Ctx) => Promise<number>; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = (t: string) => (supabase().from(t).select('*', { count: 'exact', head: true }) as any);

async function comments(uid: string, sinceISO: string): Promise<number> {
	const [a, b] = await Promise.all([
		hc(C('community_post_comments').eq('user_id', uid).gte('created_at', sinceISO)),
		hc(C('card_comments').eq('user_id', uid).gte('created_at', sinceISO))
	]);
	return a + b;
}

const WEEKLY: Def[] = [
	{ id: 'add15', icon: '🃏', text: '15 Karten hinzufügen', target: 15, cp: 60, count: (c) => hc(C('cards').eq('user_id', c.uid).gte('added_at', c.weekISO)) },
	{ id: 'sell3', icon: '🏷️', text: '3 Karten verkaufen', target: 3, cp: 60, count: (c) => hc(C('cards').eq('user_id', c.uid).eq('status', 'sold').gte('sold_date', c.weekDate)) },
	{ id: 'comment5', icon: '💬', text: '5 Kommentare schreiben', target: 5, cp: 40, count: (c) => comments(c.uid, c.weekISO) },
	{ id: 'post2', icon: '🎉', text: '2 Beiträge posten (Pull/Guide/Review)', target: 2, cp: 50, count: (c) => hc(C('community_posts').eq('user_id', c.uid).gte('created_at', c.weekISO)) },
	{ id: 'alert3', icon: '🔔', text: '3 Preisalarme erstellen', target: 3, cp: 40, count: (c) => hc(C('price_alerts').eq('user_id', c.uid).gte('created_at', c.weekISO)) },
	{ id: 'showcase1', icon: '🖼️', text: '1 Showcase erstellen', target: 1, cp: 50, count: (c) => hc(C('collections').eq('user_id', c.uid).gte('created_at', c.weekISO)) },
	{ id: 'like5', icon: '❤️', text: '5 Showcases liken', target: 5, cp: 30, count: (c) => hc(C('collection_reactions').eq('user_id', c.uid).eq('kind', 'like').gte('created_at', c.weekISO)) },
	{ id: 'trade1', icon: '🔄', text: '1 Trade abschließen', target: 1, cp: 70, count: (c) => hc(C('trades').or(`proposer.eq.${c.uid},responder.eq.${c.uid}`).eq('status', 'abgeschlossen').gte('updated_at', c.weekISO)) },
	{ id: 'friend1', icon: '👥', text: '1 neuen Freund finden', target: 1, cp: 30, count: (c) => hc(C('friendships').or(`requester.eq.${c.uid},addressee.eq.${c.uid}`).gte('created_at', c.weekISO)) }
];

const DAILY: Def[] = [
	{ id: 'login', icon: '📅', text: 'Einloggen', target: 1, cp: 20, count: async (c) => (c.lastLogin === c.today ? 1 : 0) },
	{ id: 'add3', icon: '🃏', text: '3 Karten hinzufügen', target: 3, cp: 20, count: (c) => hc(C('cards').eq('user_id', c.uid).gte('added_at', c.dayISO)) },
	{ id: 'comment1', icon: '💬', text: '1 Kommentar schreiben', target: 1, cp: 15, count: (c) => comments(c.uid, c.dayISO) },
	{ id: 'alert1', icon: '🔔', text: '1 Preisalarm erstellen', target: 1, cp: 15, count: (c) => hc(C('price_alerts').eq('user_id', c.uid).gte('created_at', c.dayISO)) },
	{ id: 'post1', icon: '🎉', text: '1 Beitrag posten', target: 1, cp: 20, count: (c) => hc(C('community_posts').eq('user_id', c.uid).gte('created_at', c.dayISO)) }
];

function hashStr(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0; }
function pick(pool: Def[], seed: string, n: number): Def[] {
	return [...pool].map((d) => ({ d, k: hashStr(seed + ':' + d.id) })).sort((a, b) => a.k - b.k).slice(0, n).map((x) => x.d);
}

export interface Quest { id: string; periodId: string; period: 'week' | 'day'; icon: string; text: string; target: number; progress: number; cp: number; done: boolean; claimed: boolean; }
export interface QuestData { cp: number; weekly: Quest[]; daily: Quest[]; }

export async function getQuests(): Promise<QuestData> {
	const uid = await uidOrNull();
	if (!uid) throw new Error('Nicht eingeloggt');
	const us = await supabase().from('user_settings').select('cp, claimed_quests, last_login').eq('user_id', uid).maybeSingle();
	const cp = us.data?.cp ?? 0;
	const claimed = (us.data?.claimed_quests as string[] | null) ?? [];
	const lastLogin = (us.data?.last_login as string | null) ?? null;

	const weekISO = startOfWeek().toISOString();
	const ctx: Ctx = { uid, weekISO, weekDate: weekISO.slice(0, 10), dayISO: startOfDayISO(), today: todayStr(), lastLogin };
	const weekId = isoWeekId(); const dayId = ctx.today;

	const build = async (defs: Def[], periodId: string, period: 'week' | 'day'): Promise<Quest[]> =>
		Promise.all(defs.map(async (d) => {
			const progress = await d.count(ctx);
			return { id: d.id, periodId, period, icon: d.icon, text: d.text, target: d.target, cp: d.cp, progress, done: progress >= d.target, claimed: claimed.includes(`${periodId}:${d.id}`) };
		}));

	const [weekly, daily] = await Promise.all([
		build(pick(WEEKLY, weekId, 3), weekId, 'week'),
		build(pick(DAILY, dayId, 3), dayId, 'day')
	]);
	return { cp, weekly, daily };
}

// Belohnung einloesen (einmal pro Quest+Periode). Gibt den neuen CP-Stand zurueck.
export async function claimQuest(q: Quest): Promise<number> {
	const uid = await uidOrNull();
	if (!uid) throw new Error('Nicht eingeloggt');
	const us = await supabase().from('user_settings').select('cp, claimed_quests').eq('user_id', uid).maybeSingle();
	let cp = us.data?.cp ?? 0;
	let claimed = (us.data?.claimed_quests as string[] | null) ?? [];
	const cid = `${q.periodId}:${q.id}`;
	if (claimed.includes(cid)) return cp;
	if (q.progress < q.target) throw new Error('Quest noch nicht abgeschlossen.');
	cp += q.cp;
	// Achievement-Eintraege (ach:*) dauerhaft behalten, Quest-Eintraege begrenzen.
	claimed = [...claimed, cid];
	claimed = [...claimed.filter((x) => x.startsWith('ach:')), ...claimed.filter((x) => !x.startsWith('ach:')).slice(-80)];
	const { error } = await supabase().from('user_settings').upsert({ user_id: uid, cp, claimed_quests: claimed }, { onConflict: 'user_id' });
	if (error) throw new Error(error.message);
	return cp;
}
