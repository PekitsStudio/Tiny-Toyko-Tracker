import { describe, it, expect } from 'vitest';
import { levelFromXp } from '$lib/services/gamification.service';

describe('levelFromXp', () => {
	it('bleibt bei Level 1 unter 50 XP', () => {
		expect(levelFromXp(0)).toEqual({ level: 1, into: 0, need: 50 });
		expect(levelFromXp(49)).toEqual({ level: 1, into: 49, need: 50 });
	});
	it('wechselt bei 50 XP auf Level 2', () => {
		expect(levelFromXp(50)).toEqual({ level: 2, into: 0, need: 100 });
	});
	it('kumulierte Schwellen (Level 3 ab 150 XP)', () => {
		expect(levelFromXp(149).level).toBe(2);
		expect(levelFromXp(150)).toEqual({ level: 3, into: 0, need: 150 });
	});
	it('into ist der Fortschritt im aktuellen Level', () => {
		const r = levelFromXp(200); // Level 3, Basis 150 -> into 50
		expect(r.level).toBe(3);
		expect(r.into).toBe(50);
	});
});
