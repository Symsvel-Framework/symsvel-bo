<script lang="ts">
	import { onMount } from 'svelte';
	import { provideProjectBrand } from '../lib/branding';
	import favicon from '#lib/assets/favicon.svg';
	import { installBoTheme } from '../lib/theme/bo-theme';
	import AppShell from '#lib/components/AppShell.svelte';
	import { isPublicBoRoute } from '../lib/bo/public-routes';
	import { page } from '$app/state';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	const brandName = provideProjectBrand();
	// Auth, activation, recovery and pending 2FA must render without a BO session.
	const publicRoute = $derived(isPublicBoRoute(page.url.pathname));
	onMount(installBoTheme);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{$brandName} BO</title>
</svelte:head>

{#if publicRoute}
	{@render children()}
{:else}
	<AppShell>{@render children()}</AppShell>
{/if}
