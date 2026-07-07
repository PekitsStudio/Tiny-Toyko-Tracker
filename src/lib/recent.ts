const KEY = 'ttt-recent';
export function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function recordRecent(q: string): string[] {
  q = (q || '').trim(); if (!q) return getRecent();
  let a = getRecent().filter((x) => x.toLowerCase() !== q.toLowerCase());
  a.unshift(q); a = a.slice(0, 8);
  localStorage.setItem(KEY, JSON.stringify(a));
  return a;
}
