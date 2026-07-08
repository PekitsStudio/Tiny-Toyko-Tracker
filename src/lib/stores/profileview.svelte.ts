// Welches oeffentliche Profil ist gerade geoeffnet? (null = keins)
class ProfileViewStore {
	userId = $state<string | null>(null);
	open(id: string) { this.userId = id; }
	close() { this.userId = null; }
}
export const profileView = new ProfileViewStore();
