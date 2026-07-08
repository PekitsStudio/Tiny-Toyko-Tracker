// Gemeinsamer Zustand fuer die Detailansicht (Suche, Sammlung, Wunschliste, Marktplatz).
export interface DetailCard {
	game: string;
	name: string;
	imageUrl?: string | null;
	setName?: string | null;
	number?: string | null;
	rarity?: string | null;
	lang?: string | null;
	price?: number | null;
	priceLow?: number | null;
	priceTrend?: number | null;
	currency?: string | null;
	cardmarketUrl?: string | null;
	condition?: string | null;
	quantity?: number;
	cardId?: number; // Sammlungskarte -> Bearbeiten/Verkaufen
	notes?: string | null;
	forSale?: boolean | null;
	askingPrice?: number | null;
	wishlistId?: number; // Wunschlisten-Karte -> oeffentlich suchen
	seeking?: boolean | null;
	seekMaxPrice?: number | null;
}

class DetailStore {
	card = $state<DetailCard | null>(null);
	savedTick = $state(0);
	open(c: DetailCard) { this.card = c; }
	close() { this.card = null; }
	markSaved() { this.savedTick++; }
}

export const detail = new DetailStore();
