export type Tab = 'start' | 'suche' | 'sammlung' | 'wunschliste' | 'marktplatz' | 'profil';
class NavStore {
	tab = $state<Tab>('start');
	go(t: Tab) { this.tab = t; }
}
export const nav = new NavStore();
