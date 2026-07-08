export type Tab = 'start' | 'suche' | 'sammlung' | 'wunschliste' | 'marktplatz' | 'verkauft' | 'profil';
class NavStore {
	tab = $state<Tab>('start');
	go(t: Tab) { this.tab = t; }
}
export const nav = new NavStore();
