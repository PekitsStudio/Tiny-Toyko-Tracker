import type { MarketCard } from '$lib/services/market.service';

// Welches Marktplatz-Angebot ist gerade im Detail-Fenster offen? (null = keins)
class MarketViewStore {
	card = $state<MarketCard | null>(null);
	open(c: MarketCard) { this.card = c; }
	close() { this.card = null; }
}

export const marketView = new MarketViewStore();
