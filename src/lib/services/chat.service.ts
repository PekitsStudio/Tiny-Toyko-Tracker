import { supabase } from '$lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Live-Chat-Raeume je Spiel (chat_messages, Realtime aktiviert).
export type ChatRoom = 'general' | 'pokemon' | 'magic' | 'yugioh' | 'onepiece';

export interface ChatMessage {
	id: number;
	room: string;
	user_id: string;
	author_name: string | null;
	author_country: string | null;
	body: string;
	created_at: string;
}

export const CHAT_ROOMS: { id: ChatRoom; label: string }[] = [
	{ id: 'general', label: 'Allgemein' },
	{ id: 'pokemon', label: 'Pokémon' },
	{ id: 'magic', label: 'Magic' },
	{ id: 'yugioh', label: 'Yu-Gi-Oh' },
	{ id: 'onepiece', label: 'One Piece' }
];

// Die letzten Nachrichten eines Raums (chronologisch: aelteste zuerst).
export async function listChat(room: ChatRoom, limit = 60): Promise<ChatMessage[]> {
	const { data, error } = await supabase()
		.from('chat_messages')
		.select('id, room, user_id, author_name, author_country, body, created_at')
		.eq('room', room)
		.order('created_at', { ascending: false })
		.limit(limit);
	if (error) throw new Error(error.message);
	return ((data ?? []) as ChatMessage[]).reverse();
}

export async function sendChat(room: ChatRoom, body: string): Promise<void> {
	const { data, error: uerr } = await supabase().auth.getUser();
	if (uerr || !data.user) throw new Error('Nicht eingeloggt');
	const text = body.trim();
	if (!text) return;
	const { error } = await supabase().from('chat_messages').insert({ room, user_id: data.user.id, body: text });
	if (error) throw new Error(error.message);
}

// Realtime: bei jeder neuen Nachricht im Raum onInsert aufrufen.
export function subscribeChat(room: ChatRoom, onInsert: (m: ChatMessage) => void): RealtimeChannel {
	return supabase()
		.channel(`chat:${room}`)
		.on(
			'postgres_changes',
			{ event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room=eq.${room}` },
			(payload) => onInsert(payload.new as ChatMessage)
		)
		.subscribe();
}

export function unsubscribeChat(ch: RealtimeChannel): void {
	supabase().removeChannel(ch);
}
