export type Game = 'pokemon' | 'magic' | 'yugioh' | 'onepiece' | 'lorcana';
export type Visibility = 'private' | 'unlisted' | 'public';
export type Plan = 'free' | 'pro';
export type SearchMode = 'name' | 'number';

export interface UserProfile { id: string; name: string; plan: Plan; }
export interface Collection { id: number; name: string; visibility: Visibility; cardCount: number; cover?: string; }

// Suchergebnis-Karte (Felder wie in der bestehenden App, bewusst locker typisiert).
export interface SearchCard {
  game: Game;
  name: string;
  number?: string;
  setName?: string;
  setCode?: string;
  set_code?: string;
  rarity?: string;
  imageUrl?: string;
  cardmarketUrl?: string;
  lang?: string;
  currency?: string;
  externalId?: string;
  needsDetail?: boolean;
  cardmarketPrice?: number | null;
  priceLow?: number | null;
  priceTrend?: number | null;
  extra?: Record<string, unknown>;
}

export interface SearchFilters {
  set: string; rarity: string; lang: string; priceOnly: boolean;
  sort: 'relevance' | 'price-desc' | 'price-asc' | 'name' | 'number';
}
