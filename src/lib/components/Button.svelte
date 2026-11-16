<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { uiLanguage } from '../api/locales';
	import { boComponentCopy } from './texts';

	let {
		children,
		loading = false,
		variant = 'primary',
		class: className = '',
		...rest
	}: HTMLButtonAttributes & {
		children: Snippet;
		loading?: boolean;
		variant?: 'primary' | 'secondary' | 'danger';
	} = $props();
	const t = $derived(boComponentCopy($uiLanguage));
</script>

<button
	{...rest}
	class={`bo-button bo-button-${variant} ${className}`}
	disabled={Boolean(rest.disabled) || loading}
>
	{#if loading}{t.wait}{:else}{@render children()}{/if}
</button>
