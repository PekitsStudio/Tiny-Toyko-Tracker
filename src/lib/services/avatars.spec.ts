import { describe, it, expect } from 'vitest';
import { parseFile, CP_PRICE } from '$lib/services/avatars.service';

describe('parseFile', () => {
	it('trennt Seltenheits-Präfix und Name', () => {
		expect(parseFile('gold-Drakini.jpg')).toEqual({ rarity: 'gold', name: 'Drakini' });
	});
	it('behält mehrteilige Namen, ersetzt Bindestriche durch Leerzeichen', () => {
		expect(parseFile('common-Meister-Sammler-Cardax.jpg')).toEqual({ rarity: 'common', name: 'Meister Sammler Cardax' });
	});
	it('nutzt "common" als Standard, wenn das Präfix keine bekannte Stufe ist', () => {
		expect(parseFile('Floreh.jpg')).toEqual({ rarity: 'common', name: 'Floreh' });
	});
});

describe('CP_PRICE', () => {
	it('common kostet 500 CP', () => {
		expect(CP_PRICE.common).toBe(500);
	});
	it('steigt mit der Seltenheit', () => {
		expect(CP_PRICE.gold).toBeGreaterThan(CP_PRICE.silber);
		expect(CP_PRICE.legend).toBeGreaterThan(CP_PRICE.gold);
	});
});
