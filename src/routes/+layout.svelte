<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import AppShell from '#lib/components/AppShell.svelte';
	import { isPublicBoRoute } from '#lib/bo/public-routes';
	import { page } from '$app/state';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	// Auth, activation, recovery and pending 2FA must render without a BO session.
	const publicRoute = $derived(isPublicBoRoute(page.url.pathname));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if publicRoute}
	{@render children()}
{:else}
	<AppShell>{@render children()}</AppShell>
{/if}
