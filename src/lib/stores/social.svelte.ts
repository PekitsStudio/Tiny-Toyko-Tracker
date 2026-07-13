class SocialStore {
	chatWith = $state<{ id: string; name: string } | null>(null);
	openChat(id: string, name: string) { this.chatWith = { id, name }; }
	clear() { this.chatWith = null; }
}
export const social = new SocialStore();
