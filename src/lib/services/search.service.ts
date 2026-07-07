import type { Game, SearchCard, SearchFilters, SearchMode } from '$lib/types';
import type { CardsRepo, PokeI18n } from '$lib/repositories/cards.repo';

export interface PokeHit { enName: string; chips: { name: string; lang: string }[]; }
export interface Facets { sets: string[]; rarities: string[]; langs: string[]; }

export class SearchService {
  constructor(private readonly repo: CardsRepo) {}

  // Vorschlagsmenue ist namensbasiert -> in Nummernsuche / anderen Spielen aus.
  shouldAutocomplete(game: Game, mode: SearchMode, q: string): boolean {
    return mode !== 'number' && q.length >= 2 && (game === 'pokemon' || game === 'onepiece');
  }

  async pokeAuto(q: string): Promise<{ langs: string[]; hits: PokeHit[] }> {
    const data: PokeI18n = await this.repo.pokeI18n();
    const t = q.toLowerCase(); const hits: PokeHit[] = []; const langs = data.langs;
    for (const row of data.rows) {
      if (row.some((n) => n && n.toLowerCase().includes(t))) {
        const enName = row[langs.indexOf('en')] || row[0];
        const chips = langs.map((lg, i) => (row[i] ? { name: row[i], lang: lg } : null)).filter(Boolean) as { name: string; lang: string }[];
        hits.push({ enName, chips });
      }
      if (hits.length >= 8) break;
    }
    return { langs, hits };
  }

  async opAuto(q: string): Promise<string[]> {
    const names = await this.repo.opNames();
    const t = q.toLowerCase();
    return names.filter((n) => n.toLowerCase().includes(t)).slice(0, 12);
  }

  search(p: { game: Game; q: string; lang: string; mode: SearchMode }) { return this.repo.search(p); }
  enrich(ids: string[], lang: string) { return this.repo.enrich(ids, lang); }

  facets(cards: SearchCard[]): Facets {
    return {
      sets: [...new Set(cards.map((c) => c.setName).filter(Boolean) as string[])].sort(),
      rarities: [...new Set(cards.map((c) => c.rarity).filter(Boolean) as string[])].sort(),
      langs: [...new Set(cards.map((c) => c.lang).filter(Boolean) as string[])],
    };
  }

  // Portierung von applySearchFilters (Filter + Sortierung).
  apply(all: SearchCard[], f: SearchFilters): SearchCard[] {
    let list = all
      .filter((c) => !f.set || c.setName === f.set)
      .filter((c) => !f.rarity || c.rarity === f.rarity)
      .filter((c) => !f.lang || c.lang === f.lang)
      .filter((c) => !f.priceOnly || c.cardmarketPrice != null);
    const price = (c: SearchCard) => c.cardmarketPrice ?? -1;
    const numOf = (c: SearchCard) => parseInt(String(c.number).replace(/\D/g, '')) || 0;
    if (f.sort === 'price-desc') list = [...list].sort((a, b) => price(b) - price(a));
    else if (f.sort === 'price-asc') list = [...list].sort((a, b) => price(a) - price(b));
    else if (f.sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (f.sort === 'number') list = [...list].sort((a, b) => numOf(a) - numOf(b));
    return list;
  }
}
