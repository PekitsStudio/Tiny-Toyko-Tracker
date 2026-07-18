<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import AuthBar from '$lib/components/AuthBar.svelte';
	import Legal from '$lib/components/Legal.svelte';
	import { legal } from '$lib/stores/legal.svelte';
	import { loadApiKeyIntoAdapter, initPricing } from '$lib/services/settings.service';
	import { touchLogin } from '$lib/services/gamification.service';
	import '../app.css';

	let { children } = $props();

	onMount(async () => {
		initPricing();
		await auth.init();
		loadApiKeyIntoAdapter();
		touchLogin();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<AuthBar />
{@render children()}

<footer class="site-footer">
	<span>© {new Date().getFullYear()} Tiny Tokyo Tracker</span>
	<button type="button" class="legal-link" onclick={() => legal.show()}>Impressum &amp; Datenschutz</button>
</footer>

<Legal />

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
	{/each}
</div>

<style>
	.site-footer {
		max-width: 1100px;
		margin: 40px auto 0;
		padding: 18px 16px 30px;
		border-top: 1px solid #232833;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		color: var(--muted, #9aa0ad);
		font-size: 0.85rem;
	}
	.legal-link {
		background: none;
		border: 0;
		color: var(--accent, #6366f1);
		cursor: pointer;
		font: inherit;
		text-decoration: underline;
	}
</style>
