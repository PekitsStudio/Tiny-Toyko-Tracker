import { describe, it, expect } from 'vitest';
import { isoWeekId, startOfWeek } from '$lib/services/quests.service';

describe('startOfWeek', () => {
	it('liefert Montag 00:00 der Woche', () => {
		const m = startOfWeek(new Date(2026, 0, 1)); // Do 01.01.2026 -> Mo 29.12.2025
		expect(m.getDay()).toBe(1);
		expect(m.getHours()).toBe(0);
		expect(m.getFullYear()).toBe(2025);
		expect(m.getMonth()).toBe(11);
		expect(m.getDate()).toBe(29);
	});
	it('mutiert die Eingabe nicht', () => {
		const d = new Date(2026, 0, 1);
		startOfWeek(d);
		expect(d.getDate()).toBe(1);
	});
});

describe('isoWeekId', () => {
	it('01.01.2026 (Donnerstag) ist Woche 1', () => {
		expect(isoWeekId(new Date(2026, 0, 1))).toBe('2026-W01');
	});
	it('29.12.2025 (Montag) gehört zu 2026-W01', () => {
		expect(isoWeekId(new Date(2025, 11, 29))).toBe('2026-W01');
	});
	it('ist deterministisch und wohlgeformt', () => {
		const d = new Date(2026, 5, 15);
		expect(isoWeekId(d)).toBe(isoWeekId(d));
		expect(isoWeekId(d)).toMatch(/^\d{4}-W\d{2}$/);
	});
});
