import { describe, it, expect } from 'vitest';
import { mergeMoney } from '$lib/services/stats.service';

describe('mergeMoney', () => {
	it('summiert pro Währung, ohne zu vermischen', () => {
		expect(mergeMoney({ EUR: 10, USD: 5 }, { EUR: 2 })).toEqual({ EUR: 12, USD: 5 });
	});
	it('behandelt leere Maps', () => {
		expect(mergeMoney({}, { USD: 3 })).toEqual({ USD: 3 });
		expect(mergeMoney()).toEqual({});
	});
});
