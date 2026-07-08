import type { Game, SearchCard, SearchMode } from '$lib/types';
import { Adapters } from '$lib/adapters/tcg-adapters.js';

export interface PokeI18n {
	langs: string[];
	rows: string[][];
}
export type EnrichDetail = Partial<SearchCard>;

export interface CardsRepo {
	search(p: { game: Game; q: string; lang: string; mode: SearchMode }): Promise<SearchCard[]>;
	enrich(ids: string[], lang: string): Promise<Record<string, EnrichDetail>>;
	opNames(): Promise<string[]>;
	pokeI18n(): Promise<PokeI18n>;
}

// Ruft die portierte TCG-Engine (adapters) direkt auf — kein api/-Umweg noetig.
// Die Adapter sprechen die externen APIs (tcgdex, scryfall, ygoprodeck, optcgapi)
// per CORS direkt aus dem Browser an.
const A = Adapters as unknown as {
	search: (
		game: Game,
		q: string,
		opts: { lang: string; mode: SearchMode }
	) => Promise<SearchCard[]>;
	enrichPokemon: (ids: string[], opts: { lang: string }) => Promise<Record<string, EnrichDetail>>;
	onePieceNames: () => Promise<string[]>;
};

export class AdapterCardsRepo implements CardsRepo {
	private _op: string[] | null = null;
	private _poke: PokeI18n | null = null;

	async search(p: { game: Game; q: string; lang: string; mode: SearchMode }): Promise<SearchCard[]> {
		return (await A.search(p.game, p.q, { lang: p.lang, mode: p.mode })) || [];
	}

	async enrich(ids: string[], lang: string): Promise<Record<string, EnrichDetail>> {
		return (await A.enrichPokemon(ids, { lang })) || {};
	}

	async opNames(): Promise<string[]> {
		if (this._op) return this._op;
		try {
			this._op = (await A.onePieceNames()) || [];
		} catch {
			this._op = [];
		}
		return this._op;
	}

	async pokeI18n(): Promise<PokeI18n> {
		if (this._poke) return this._poke;
		try {
			this._poke = await (await fetch('pokemon-i18n.json')).json();
		} catch {
			this._poke = { langs: [], rows: [] };
		}
		return this._poke!;
	}
}
