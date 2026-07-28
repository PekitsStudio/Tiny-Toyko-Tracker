import { MESSAGES, type Locale } from '$lib/i18n/dict';

const KEY = 'ttt_lang';

function initialLocale(): Locale {
	try {
		const s = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
		if (s === 'de' || s === 'en') return s;
	} catch {
		/* localStorage nicht verfügbar (SSR) */
	}
	return 'de';
}

// Reaktiver Sprach-Store. `t(...)` liest `locale` -> Umschalten rendert sofort neu.
class I18n {
	locale = $state<Locale>(initialLocale());

	setLocale(l: Locale): void {
		this.locale = l;
		try {
			localStorage.setItem(KEY, l);
			document.documentElement.lang = l;
		} catch {
			/* egal */
		}
	}

	// Übersetzung nachschlagen; Fallback: Deutsch, dann der Schlüssel selbst.
	// Platzhalter {name} werden aus params ersetzt.
	t = (key: string, params?: Record<string, string | number>): string => {
		const dict = MESSAGES[this.locale] ?? MESSAGES.de;
		let s = dict[key] ?? MESSAGES.de[key] ?? key;
		if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
		return s;
	};
}

export const i18n = new I18n();
