// Gemeinsamer Zustand fuer die Detailansicht (von Suche, Sammlung, Wunschliste genutzt).
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
}

class DetailStore {
	card = $state<DetailCard | null>(null);
	open(c: DetailCard) {
		this.card = c;
	}
	close() {
		this.card = null;
	}
}

export const detail = new DetailStore();
