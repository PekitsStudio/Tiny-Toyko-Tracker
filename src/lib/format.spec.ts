import { describe, it, expect } from 'vitest';
import { fmt, refText, extraLine, langLabel, flagFor, GAME_LABEL } from '$lib/format';
import type { SearchCard } from '$lib/types';

describe('fmt', () => {
	it('formatiert EUR im de-DE-Stil', () => {
		const s = fmt(1234.5, 'EUR');
		expect(s).toContain('1.234,50');
		expect(s).toContain('€');
	});
	it('formatiert USD im en-US-Stil', () => {
		const s = fmt(10, 'USD');
		expect(s).toContain('$');
		expect(s).toContain('10.00');
	});
	it('behandelt null als 0', () => {
		expect(fmt(null)).toContain('0,00');
	});
});

describe('refText', () => {
	it('kombiniert Set-Code und Nummer', () => {
		expect(refText({ setCode: 'OBF', number: '125' } as unknown as SearchCard)).toBe('OBF · 125');
	});
	it('lässt den Code weg, wenn die Nummer ihn schon enthält', () => {
		expect(refText({ setCode: 'OP01', number: 'OP01-001' } as unknown as SearchCard)).toBe('OP01-001');
	});
	it('fällt auf Nummer oder Code allein zurück', () => {
		expect(refText({ number: '7' } as unknown as SearchCard)).toBe('7');
		expect(refText({ setCode: 'SV1' } as unknown as SearchCard)).toBe('SV1');
	});
});

describe('extraLine', () => {
	it('Pokémon zeigt HP/Typen/Stufe', () => {
		const c = { game: 'pokemon', extra: { hp: '120', types: ['Fire'], stage: 'Basic' } } as unknown as SearchCard;
		expect(extraLine(c)).toBe('120 HP · Fire · Basic');
	});
	it('Riftbound zeigt Typ/Domain/Energie/Macht', () => {
		const c = { game: 'riftbound', extra: { type: 'Unit', domain: 'Fury', energy: 3, might: 4 } } as unknown as SearchCard;
		expect(extraLine(c)).toBe('Unit · Fury · 3 Energie · 4 Macht');
	});
});

describe('Labels', () => {
	it('langLabel kennt bekannte und unbekannte Codes', () => {
		expect(langLabel('de')).toBe('Deutsch');
		expect(langLabel('')).toBe('Unbekannt');
		expect(langLabel('xx')).toBe('XX');
	});
	it('GAME_LABEL enthält Riftbound', () => {
		expect(GAME_LABEL.riftbound).toBe('Riftbound');
	});
	it('flagFor liefert Emoji oder leer', () => {
		expect(flagFor('de')).toBe('🇩🇪');
		expect(flagFor('zz')).toBe('');
	});
});
