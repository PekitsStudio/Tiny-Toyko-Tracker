import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$lib/config';

// Ein einziger Client fuer die ganze App. Session wird im Browser gespeichert
// (localStorage) und automatisch erneuert.
let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
	if (!_client) {
		_client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
		});
	}
	return _client;
}
