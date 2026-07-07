<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { TURNSTILE_SITE_KEY } from '$lib/config';
	import Turnstile from './Turnstile.svelte';

	let email = $state('');
	let password = $state('');
	let token = $state('');
	let err = $state('');
	let busy = $state(false);
	let tsKey = $state(0); // Turnstile-Token ist Einweg -> bei Fehler Widget neu laden

	async function login() {
		err = '';
		busy = true;
		try {
			await auth.signIn(email, password, token || undefined);
			password = '';
		} catch (e) {
			err = (e as Error).message;
			token = '';
			tsKey++;
		} finally {
			busy = false;
		}
	}
</script>

<div class="authbar">
	{#if auth.user}
		<span class="who">Angemeldet: <b>{auth.user.email}</b></span>
		<button class="ghost" onclick={() => auth.signOut()}>Abmelden</button>
	{:else}
		<form onsubmit={(e) => { e.preventDefault(); login(); }}>
			<input type="email" placeholder="E-Mail" bind:value={email} autocomplete="username" />
			<input type="password" placeholder="Passwort" bind:value={password} autocomplete="current-password" />
			{#if TURNSTILE_SITE_KEY}
				{#key tsKey}<Turnstile ontoken={(t) => (token = t)} />{/key}
			{/if}
			<button disabled={busy}>{busy ? '…' : 'Anmelden'}</button>
			{#if err}<span class="err">{err}</span>{/if}
		</form>
	{/if}
</div>

<style>
	.authbar {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		padding: 10px 16px;
		border-bottom: 1px solid #232833;
	}
	.authbar form {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
	}
	.authbar input {
		padding: 7px 10px;
		border-radius: 8px;
		border: 1px solid #2a2f3a;
		background: #12151d;
		color: inherit;
	}
	.authbar button {
		padding: 7px 14px;
		border-radius: 8px;
		border: 0;
		background: var(--accent, #6366f1);
		color: #fff;
		cursor: pointer;
	}
	.authbar button.ghost {
		background: transparent;
		border: 1px solid #2a2f3a;
		color: inherit;
	}
	.who {
		color: var(--muted, #9aa0ad);
	}
	.err {
		color: #ef4444;
		font-size: 13px;
	}
</style>
