class LegalStore {
	open = $state(false);
	show() { this.open = true; }
	hide() { this.open = false; }
}
export const legal = new LegalStore();
