export type Tab = 'start' | 'suche' | 'sammlung' | 'marktplatz' | 'community' | 'profil';
class NavStore {
	tab = $state<Tab>('start');
	go(t: Tab) { this.tab = t; }
}
export const nav = new NavStore();
