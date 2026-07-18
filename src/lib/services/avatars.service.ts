import { supabase } from '$lib/supabase';

const BUCKET = 'avatars';

// --- Seltenheit -> CP-Preis. Unbekannte Stufen bekommen den Standardpreis. ---
export const CP_PRICE: Record<string, number> = {
	common: 500,
	bronze: 500,
	silber: 900,
	silver: 900,
	gold: 1500,
	diamant: 3000,
	diamond: 3000,
	legend: 6000,
	legendary: 6000
};
const DEFAULT_PRICE = 500;
const KNOWN_RARITIES = Object.keys(CP_PRICE);

// Anzeige + Optik pro Stufe.
export const RARITY_META: Record<string, { label: string; order: number }> = {
	common: { label: 'Common', order: 0 },
	bronze: { label: 'Bronze', order: 1 },
	silber: { label: 'Silber', order: 2 },
	silver: { label: 'Silber', order: 2 },
	gold: { label: 'Gold', order: 3 },
	diamant: { label: 'Diamant', order: 4 },
	diamond: { label: 'Diamant', order: 4 },
	legend: { label: 'Legendär', order: 5 },
	legendary: { label: 'Legendär', order: 5 }
};

export interface ShopAvatar {
	path: string;        // "<Kollektion>/<Set>/<datei>.jpg"
	url: string;         // oeffentliche URL
	name: string;        // "Cardax"
	rarity: string;      // "common"
	price: number;       // CP
	owned: boolean;
	active: boolean;     // aktuell ausgeruestet
}
export interface ShopSet { key: string; label: string; avatars: ShopAvatar[]; }
export interface ShopCollection { key: string; label: string; sets: ShopSet[]; }
export interface ShopData { cp: number; owned: string[]; avatarUrl: string | null; collections: ShopCollection[]; }

async function uidOrNull(): Promise<string | null> {
	const { data } = await supabase().auth.getUser();
	return data.user?.id ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isFolder(e: any): boolean { return e && e.id === null; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isImage(e: any): boolean { return e && e.id !== null && /\.(jpe?g|png|webp|gif)$/i.test(e.name); }

async function listRaw(prefix: string): Promise<unknown[]> {
	const { data, error } = await supabase().storage.from(BUCKET).list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
	if (error) throw new Error(error.message);
	return data ?? [];
}

function pretty(s: string): string {
	return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

// "common-Meister-Sammler-Cardax.jpg" -> { rarity:'common', name:'Meister Sammler Cardax' }
function parseFile(file: string): { rarity: string; name: string } {
	const base = file.replace(/\.[^.]+$/, '').trim();
	const i = base.indexOf('-');
	if (i > 0) {
		const pre = base.slice(0, i).toLowerCase();
		if (KNOWN_RARITIES.includes(pre)) return { rarity: pre, name: base.slice(i + 1).replace(/[-_]+/g, ' ').trim() };
	}
	return { rarity: 'common', name: base.replace(/[-_]+/g, ' ').trim() };
}

export async function getShop(): Promise<ShopData> {
	const uid = await uidOrNull();
	if (!uid) throw new Error('Nicht eingeloggt');

	const us = await supabase().from('user_settings').select('cp, owned_avatars, avatar_url').eq('user_id', uid).maybeSingle();
	const cp = (us.data?.cp as number | null) ?? 0;
	const owned = (us.data?.owned_avatars as string[] | null) ?? [];
	const avatarUrl = (us.data?.avatar_url as string | null) ?? null;

	const collections: ShopCollection[] = [];
	const roots = await listRaw('');
	for (const r of roots) {
		if (!isFolder(r)) continue;
		const cKey = (r as { name: string }).name;
		const sets: ShopSet[] = [];
		const subs = await listRaw(cKey);
		for (const s of subs) {
			if (!isFolder(s)) continue;
			const sKey = (s as { name: string }).name;
			const files = await listRaw(`${cKey}/${sKey}`);
			const avatars: ShopAvatar[] = [];
			for (const f of files) {
				if (!isImage(f)) continue;
				const fname = (f as { name: string }).name;
				const path = `${cKey}/${sKey}/${fname}`;
				const { rarity, name } = parseFile(fname);
				const { data } = supabase().storage.from(BUCKET).getPublicUrl(path);
				const url = data.publicUrl;
				avatars.push({
					path, url, name, rarity,
					price: CP_PRICE[rarity] ?? DEFAULT_PRICE,
					owned: owned.includes(path),
					active: !!avatarUrl && avatarUrl === url
				});
			}
			avatars.sort((a, b) => (RARITY_META[a.rarity]?.order ?? 0) - (RARITY_META[b.rarity]?.order ?? 0) || a.name.localeCompare(b.name));
			if (avatars.length) sets.push({ key: sKey, label: pretty(sKey), avatars });
		}
		if (sets.length) collections.push({ key: cKey, label: pretty(cKey), sets });
	}

	return { cp, owned, avatarUrl, collections };
}

// Avatar mit CP freischalten. Gibt den neuen CP-Stand zurueck.
export async function buyAvatar(path: string, price: number): Promise<number> {
	const uid = await uidOrNull();
	if (!uid) throw new Error('Nicht eingeloggt');
	const us = await supabase().from('user_settings').select('cp, owned_avatars').eq('user_id', uid).maybeSingle();
	let cp = (us.data?.cp as number | null) ?? 0;
	const owned = (us.data?.owned_avatars as string[] | null) ?? [];
	if (owned.includes(path)) return cp;
	if (cp < price) throw new Error('Nicht genug Collector Points.');
	cp -= price;
	const next = [...owned, path];
	const { error } = await supabase().from('user_settings').upsert({ user_id: uid, cp, owned_avatars: next }, { onConflict: 'user_id' });
	if (error) throw new Error(error.message);
	return cp;
}

// Freigeschalteten Avatar ausruesten (setzt avatar_url).
export async function equipAvatar(url: string): Promise<void> {
	const uid = await uidOrNull();
	if (!uid) throw new Error('Nicht eingeloggt');
	const { error } = await supabase().from('user_settings').upsert({ user_id: uid, avatar_url: url }, { onConflict: 'user_id' });
	if (error) throw new Error(error.message);
}
