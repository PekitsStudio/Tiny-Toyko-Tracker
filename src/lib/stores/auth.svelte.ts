import { supabase } from '$lib/supabase';
import type { User } from '@supabase/supabase-js';

// Reaktiver Auth-Zustand (Svelte 5 Runes in .svelte.ts).
class AuthStore {
	user = $state<User | null>(null);
	ready = $state(false);

	async init(): Promise<void> {
		if (this.ready) return;
		const { data } = await supabase().auth.getSession();
		this.user = data.session?.user ?? null;
		supabase().auth.onAuthStateChange((_event, session) => {
			this.user = session?.user ?? null;
		});
		this.ready = true;
	}

	async signIn(email: string, password: string, captchaToken?: string): Promise<void> {
		const { data, error } = await supabase().auth.signInWithPassword({
			email,
			password,
			options: captchaToken ? { captchaToken } : undefined
		});
		if (error) throw new Error(error.message);
		this.user = data.user;
	}

	async signOut(): Promise<void> {
		await supabase().auth.signOut();
		this.user = null;
	}
}

export const auth = new AuthStore();
