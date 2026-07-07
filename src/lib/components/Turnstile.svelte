<script lang="ts">
	import { onMount } from 'svelte';
	import { TURNSTILE_SITE_KEY } from '$lib/config';

	let { ontoken }: { ontoken?: (token: string) => void } = $props();
	let box: HTMLDivElement;

	onMount(() => {
		if (!TURNSTILE_SITE_KEY) return;
		const w = window as unknown as { turnstile?: any; _tsOnload?: () => void };
		const render = () => {
			try {
				w.turnstile.render(box, {
					sitekey: TURNSTILE_SITE_KEY,
					theme: 'auto',
					language: 'de',
					callback: (t: string) => ontoken?.(t)
				});
			} catch (e) {
				console.warn('Turnstile:', e);
			}
		};
		if (w.turnstile) {
			render();
			return;
		}
		w._tsOnload = render;
		const sc = document.createElement('script');
		sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=_tsOnload&render=explicit';
		sc.async = true;
		sc.defer = true;
		document.head.appendChild(sc);
	});
</script>

{#if TURNSTILE_SITE_KEY}
	<div bind:this={box}></div>
{/if}
