<script lang="ts">
	/**
	 * Pagination is presentation-only: the parent owns the API request and its state.
	 * `onPageChange` and `onLimitChange` are invoked only on user interaction.
	 */
	import { uiLanguage } from '../api/locales';
	import { boComponentCopy } from './texts';
	import Button from './Button.svelte';
	let {
		page,
		limit = 20,
		total,
		loading = false,
		onPageChange,
		onLimitChange
	}: {
		page: number;
		limit?: 10 | 20 | 50 | 100;
		total: number;
		loading?: boolean;
		onPageChange: (page: number) => void;
		onLimitChange: (limit: 10 | 20 | 50 | 100) => void;
	} = $props();

	const t = $derived(boComponentCopy($uiLanguage));
	const limitId = $props.id();
	let pages = $derived(Math.max(1, Math.ceil(Math.max(0, total) / limit)));
	let current = $derived(Math.min(Math.max(1, page), pages));
	let first = $derived(total === 0 ? 0 : (current - 1) * limit + 1);
	let last = $derived(Math.min(current * limit, total));

	function changeLimit(event: Event) {
		const value = Number((event.currentTarget as HTMLSelectElement).value);
		if (value !== 10 && value !== 20 && value !== 50 && value !== 100) return;
		if (value !== limit) onLimitChange(value);
	}

	function goTo(target: number) {
		if (!loading && target >= 1 && target <= pages && target !== current) onPageChange(target);
	}
</script>

<nav class="bo-pagination" aria-label={t.pagination}>
	<div class="bo-pagination-size">
		<label for={limitId}>{t.perPage}</label>
		<select
			id={limitId}
			value={limit}
			onchange={changeLimit}
			disabled={loading}
			aria-label={t.perPage}
		>
			{#each [10, 20, 50, 100] as size (size)}
				<option value={size}>{size}</option>
			{/each}
		</select>
	</div>

	<span class="bo-pagination-count" aria-live="polite">
		{t.count(first, last, total)}
	</span>

	<div class="bo-pagination-controls">
		<Button
			type="button"
			aria-label={t.first}
			disabled={loading || current <= 1}
			onclick={() => goTo(1)}>«</Button
		>
		<Button
			type="button"
			aria-label={t.previous}
			disabled={loading || current <= 1}
			onclick={() => goTo(current - 1)}>‹</Button
		>
		<span aria-live="polite">{t.page(current, pages)}</span>
		<Button
			type="button"
			aria-label={t.next}
			disabled={loading || current >= pages}
			onclick={() => goTo(current + 1)}>›</Button
		>
		<Button
			type="button"
			aria-label={t.last}
			disabled={loading || current >= pages}
			onclick={() => goTo(pages)}>»</Button
		>
	</div>
</nav>
