<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import AuthBar from '$lib/components/AuthBar.svelte';
	import '../app.css';

	let { children } = $props();

	onMount(() => {
		auth.init();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<AuthBar />
{@render children()}

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
	{/each}
</div>
