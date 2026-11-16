<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import AppShell from '#lib/components/AppShell.svelte';
	import { page } from '$app/state';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	// Activation and recovery are public; module CRUD routes stay private.
	const publicRoute = $derived(
		page.url.pathname === '/' ||
			page.url.pathname === '/login' ||
			page.url.pathname.startsWith('/auth/')
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if publicRoute}
	{@render children()}
{:else}
	<AppShell>{@render children()}</AppShell>
{/if}
