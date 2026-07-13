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

// ---------- Nachrichten ----------
export interface Message {
	id: number; from_user: string; to_user: string; card_name: string | null; body: string;
	read: boolean; created_at: string; from_name: string | null; to_name: string | null; incoming: boolean;
}
export async function listMessages(): Promise<Message[]> {
	await requireUser();
	return ok(await supabase().from('messages_view').select('*').order('created_at', { ascending: true }).limit(500));
}
export async function sendMessage(toUser: string, body: string, cardName?: string | null): Promise<void> {
	const uid = await requireUser();
	const { error } = await supabase().from('messages').insert({ from_user: uid, to_user: toUser, card_name: cardName ?? null, body });
	if (error) throw new Error(error.message);
}
export async function markRead(ids: number[]): Promise<void> {
	if (!ids.length) return;
	const { error } = await supabase().from('messages').update({ read: true }).in('id', ids);
	if (error) throw new Error(error.message);
}
export async function unreadCount(): Promise<number> {
	const uid = await requireUser();
	const { count, error } = await supabase().from('messages').select('id', { count: 'exact', head: true }).eq('to_user', uid).eq('read', false);
	if (error) throw new Error(error.message);
	return count ?? 0;
}

// ---------- Freunde ----------
export interface Friend { id: number; status: 'pending' | 'accepted'; otherId: string; name: string | null; country: string | null; incoming: boolean; outgoing: boolean; created_at: string; }
interface FriendRow { id: number; requester: string; addressee: string; status: 'pending' | 'accepted'; requester_name: string | null; addressee_name: string | null; requester_country: string | null; addressee_country: string | null; created_at: string; }

export async function listFriends(): Promise<Friend[]> {
	const uid = await requireUser();
	const rows = ok<FriendRow[]>(await supabase().from('friendships_view').select('*'));
	return rows.map((r) => {
		const iAmRequester = r.requester === uid;
		return {
			id: r.id, status: r.status,
			otherId: iAmRequester ? r.addressee : r.requester,
			name: iAmRequester ? r.addressee_name : r.requester_name,
			country: iAmRequester ? r.addressee_country : r.requester_country,
			incoming: r.status === 'pending' && !iAmRequester,
			outgoing: r.status === 'pending' && iAmRequester,
			created_at: r.created_at
		};
	});
}
export async function sendFriendRequest(addressee: string): Promise<void> {
	const uid = await requireUser();
	if (!addressee || addressee === uid) throw new Error('Das bist du selbst.');
	const existing = ok<{ id: number; status: string }[]>(await supabase().from('friendships').select('id,status')
		.or(`and(requester.eq.${uid},addressee.eq.${addressee}),and(requester.eq.${addressee},addressee.eq.${uid})`));
	if (existing && existing.length) throw new Error(existing[0].status === 'accepted' ? 'Ihr seid bereits befreundet.' : 'Es besteht bereits eine Anfrage.');
	const { error } = await supabase().from('friendships').insert({ requester: uid, addressee });
	if (error) throw new Error(error.message);
}
export async function acceptFriend(id: number): Promise<void> {
	const { error } = await supabase().from('friendships').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', id);
	if (error) throw new Error(error.message);
}
export async function removeFriend(id: number): Promise<void> {
	const { error } = await supabase().from('friendships').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

// ---------- Nutzersuche (nach Anzeigename) ----------
export interface FoundUser { user_id: string; name: string | null; country: string | null; }
export async function searchUsers(query: string): Promise<FoundUser[]> {
	await requireUser();
	const q = query.trim();
	if (q.length < 2) return [];
	return ok(await supabase().from('profiles').select('user_id, name, country').ilike('name', `%${q}%`).limit(20));
}
