import { GAME_LABEL } from '$lib/format';

// Gemeinsames Filter-/Sortier-System fuer alle Karten-Reiter der Sammlung.
export type SortKey = 'name' | 'price_desc' | 'price_asc' | 'newest' | 'oldest';

export interface FilterState { q: string; game: string; sort: SortKey; }
export function defaultFilter(sort: SortKey = 'name'): FilterState { return { q: '', game: '', sort }; }

// Auf diese Felder greifen Suche/Filter/Sortierung zu – jeder Reiter mappt sein
// Item darauf.
export interface FilterFields {
	game: string;
	name: string;
	set?: string | null;
	rarity?: string | null;
	number?: string | null;
	price?: number | null;
	date?: string | null;
}

export const SORT_LABEL: Record<SortKey, string> = {
	name: 'Name A–Z',
	price_desc: 'Preis ↓',
	price_asc: 'Preis ↑',
	newest: 'Neueste zuerst',
	oldest: 'Älteste zuerst'
};

const CMP: Record<SortKey, (a: FilterFields, b: FilterFields) => number> = {
	name: (a, b) => a.name.localeCompare(b.name, 'de'),
	price_desc: (a, b) => (b.price ?? 0) - (a.price ?? 0),
	price_asc: (a, b) => (a.price ?? 0) - (b.price ?? 0),
	newest: (a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')),
	oldest: (a, b) => String(a.date ?? '').localeCompare(String(b.date ?? ''))
};

export function applyFilter<T>(items: T[], s: FilterState, get: (t: T) => FilterFields): T[] {
	const q = s.q.trim().toLowerCase();
	const out = items.filter((it) => {
		const f = get(it);
		if (s.game && f.game !== s.game) return false;
		if (q) {
			const hay = `${f.name} ${f.set ?? ''} ${f.rarity ?? ''} ${f.number ?? ''}`.toLowerCase();
			if (!hay.includes(q)) return false;
		}
		return true;
	});
	const cmp = CMP[s.sort] ?? CMP.name;
	return [...out].sort((x, y) => cmp(get(x), get(y)));
}

export interface GameChip { key: string; label: string; n: number; }
export function gameCounts<T>(items: T[], get: (t: T) => FilterFields): GameChip[] {
	const m = new Map<string, number>();
	for (const it of items) { const g = get(it).game; if (g) m.set(g, (m.get(g) ?? 0) + 1); }
	return [...m.entries()]
		.map(([key, n]) => ({ key, label: GAME_LABEL[key] ?? key, n }))
		.sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
}
