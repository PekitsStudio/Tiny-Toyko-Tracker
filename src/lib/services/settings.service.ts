import { supabase } from '$lib/supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$lib/config';
import { Adapters } from '$lib/adapters/tcg-adapters.js';

// Der Adapter ist reines JS ohne Typen -- nur die hier genutzten Methoden typisieren.
const AdapterKey = Adapters as unknown as {
	setPokePriceKey: (k: string) => void;
	setJpPriceConfig: (url: string, anonKey: string) => void;
};

// Beim App-Start: Endpoint der Edge Function fuer japanische Preise setzen.
// Braucht keine Anmeldung -- der geheime PPT-Key liegt serverseitig.
export function initPricing(): void {
	AdapterKey.setJpPriceConfig(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function currentUserId(): Promise<string | null> {
	const { data } = await supabase().auth.getUser();
	return data.user?.id ?? null;
}

// PokemonPriceTracker-API-Key (fuer japanische Preise + gegradete Karten).
export async function getApiKey(): Promise<string> {
	const uid = await currentUserId();
	if (!uid) return '';
	const { data, error } = await supabase()
		.from('user_settings')
		.select('pokeprice_api_key')
		.eq('user_id', uid)
		.maybeSingle();
	if (error) return '';
	return ((data?.pokeprice_api_key as string | null) ?? '').trim();
}

export async function saveApiKey(key: string): Promise<void> {
	const uid = await currentUserId();
	if (!uid) throw new Error('Nicht eingeloggt');
	const clean = key.trim();
	const { error } = await supabase()
		.from('user_settings')
		.upsert({ user_id: uid, pokeprice_api_key: clean || null }, { onConflict: 'user_id' });
	if (error) throw new Error(error.message);
	AdapterKey.setPokePriceKey(clean);
}

// Beim App-Start aufrufen: Key laden und in den Preis-Adapter uebernehmen.
export async function loadApiKeyIntoAdapter(): Promise<void> {
	try {
		AdapterKey.setPokePriceKey(await getApiKey());
	} catch {
		/* nicht eingeloggt / kein Key -> egal */
	}
}
