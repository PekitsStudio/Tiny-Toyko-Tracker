import type { SearchCard } from '$lib/types';

export const GAME_LABEL: Record<string, string> = {
  pokemon: 'Pokémon', magic: 'Magic', yugioh: 'Yu-Gi-Oh', onepiece: 'One Piece',
};

export const FLAGS: Record<string, string> = {
  de: '🇩🇪', en: '🇬🇧', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', pt: '🇵🇹', 'pt-br': '🇧🇷',
  'pt-pt': '🇵🇹', nl: '🇳🇱', pl: '🇵🇱', ru: '🇷🇺', ja: '🇯🇵', ko: '🇰🇷',
  'zh-tw': '🇹🇼', 'zh-cn': '🇨🇳', id: '🇮🇩', th: '🇹🇭', zhs: '🇨🇳', zht: '🇹🇼',
};
const LANG_LABEL: Record<string, string> = {
  de: 'Deutsch', en: 'Englisch', fr: 'Französisch', es: 'Spanisch', it: 'Italienisch',
  pt: 'Portugiesisch', nl: 'Niederländisch', pl: 'Polnisch', ru: 'Russisch',
  ja: 'Japanisch', ko: 'Koreanisch',
};

export const flagFor = (code?: string): string => (code ? FLAGS[String(code).toLowerCase()] || '' : '');
export const langLabel = (code?: string): string => {
  const c = String(code || '').toLowerCase();
  if (!c || c === '—') return 'Unbekannt';
  return LANG_LABEL[c] || c.toUpperCase();
};

export const fmt = (n?: number | null, cur = 'EUR'): string =>
  (n ?? 0).toLocaleString(cur === 'USD' ? 'en-US' : 'de-DE', { style: 'currency', currency: cur });

export function refText(c: SearchCard): string {
  const code = c.setCode || c.set_code || '', number = c.number || '';
  if (code && number && !String(number).toUpperCase().includes(String(code).toUpperCase())) return `${code} · ${number}`;
  return number || code || '';
}

export function extraLine(c: SearchCard): string {
  const e = (c.extra || {}) as Record<string, any>;
  if (c.game === 'pokemon') return [e.hp ? `${e.hp} HP` : null, e.types?.join('/'), e.stage].filter(Boolean).join(' · ');
  if (c.game === 'magic') return [e.typeLine, e.manaCost].filter(Boolean).join('  ');
  if (c.game === 'yugioh') return [e.type, e.atk != null ? `ATK ${e.atk}` : null, e.def != null ? `DEF ${e.def}` : null].filter(Boolean).join(' · ');
  if (c.game === 'onepiece') return [e.type, e.color, e.power != null ? `Power ${e.power}` : null].filter(Boolean).join(' · ');
  return '';
}
