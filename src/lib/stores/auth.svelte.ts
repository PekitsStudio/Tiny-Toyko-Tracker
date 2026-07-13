import { supabase } from '$lib/supabase';
import type { User } from '@supabase/supabase-js';

function redirectUrl(): string | undefined {
	if (typeof window === 'undefined') return undefined;
	return window.location.origin + window.location.pathname;
}

class AuthStore {
	user = $state<User | null>(null);
	ready = $state(false);
	recovery = $state(false); // true nach Klick auf "Passwort zurücksetzen"-Link

	async init(): Promise<void> {
		if (this.ready) return;
		const { data } = await supabase().auth.getSession();
		this.user = data.session?.user ?? null;
		supabase().auth.onAuthStateChange((event, session) => {
			this.user = session?.user ?? null;
			if (event === 'PASSWORD_RECOVERY') this.recovery = true;
		});
		this.ready = true;
	}

	async signIn(email: string, password: string, captchaToken?: string): Promise<void> {
		const { data, error } = await supabase().auth.signInWithPassword({
			email, password, options: captchaToken ? { captchaToken } : undefined
		});
		if (error) throw new Error(error.message);
		this.user = data.user;
	}

	async signUp(email: string, password: string, username: string, captchaToken?: string): Promise<void> {
		const { error } = await supabase().auth.signUp({
			email, password,
			options: { data: { username }, captchaToken, emailRedirectTo: redirectUrl() }
		});
		if (error) throw new Error(error.message);
	}

	async nameAvailable(name: string): Promise<boolean> {
		const { data, error } = await supabase().rpc('name_available', { p_name: name });
		if (error) throw new Error(error.message);
		return !!data;
	}

	async resetPassword(email: string, captchaToken?: string): Promise<void> {
		const { error } = await supabase().auth.resetPasswordForEmail(email, {
			captchaToken, redirectTo: redirectUrl()
		});
		if (error) throw new Error(error.message);
	}

	async updatePassword(password: string): Promise<void> {
		const { error } = await supabase().auth.updateUser({ password });
		if (error) throw new Error(error.message);
		this.recovery = false;
	}

	async signOut(): Promise<void> {
		await supabase().auth.signOut();
		this.user = null;
	}
}

export const auth = new AuthStore();
