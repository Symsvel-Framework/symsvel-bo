<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { uiLanguage } from '../api/locales';
	import { boComponentCopy } from './texts';
	import type { BoButtonVariant } from './button';

	let {
		children,
		type = 'button',
		loading = false,
		variant = 'primary',
		class: className = '',
		...rest
	}: HTMLButtonAttributes & {
		children: Snippet;
		loading?: boolean;
		variant?: BoButtonVariant;
	} = $props();
	const t = $derived(boComponentCopy($uiLanguage));
</script>

<button
	{type}
	{...rest}
	class={`bo-button bo-button-${variant} ${className}`}
	disabled={Boolean(rest.disabled) || loading}
>
	{#if loading}{t.wait}{:else}{@render children()}{/if}
</button>
