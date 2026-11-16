<script lang="ts">
	import type { Snippet } from 'svelte';
	import { uiLanguage } from '../api/locales';

	let {
		open,
		title,
		onClose,
		children
	}: {
		open: boolean;
		title: string;
		onClose: () => void;
		children: Snippet;
	} = $props();

	let dialog: HTMLDialogElement;
	const titleId = $props.id();
	const closeLabel = $derived($uiLanguage?.toLowerCase().startsWith('fr') ? 'Fermer' : 'Close');

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
</script>

<dialog bind:this={dialog} aria-labelledby={titleId} onclose={onClose} oncancel={onClose}>
	<header class="bo-modal-heading">
		<h2 id={titleId}>{title}</h2>
		<button
			type="button"
			class="bo-modal-close"
			aria-label={closeLabel}
			onclick={() => dialog.close()}>×</button
		>
	</header>
	<div class="bo-modal-body">
		{@render children()}
	</div>
</dialog>

<style>
	dialog {
		width: min(540px, calc(100vw - 32px));
		max-height: min(90vh, 900px);
		margin: auto;
		padding: 0;
		border: 1px solid #d8e0ea;
		border-radius: 14px;
		box-shadow: 0 22px 75px rgba(15, 23, 42, 0.28);
		background: #fff;
		color: inherit;
	}
	dialog::backdrop {
		background: rgba(15, 23, 42, 0.54);
	}
	.bo-modal-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 18px 24px;
		border-bottom: 1px solid #edf0f4;
	}
	h2 {
		font-size: 1.2rem;
		margin: 0;
	}
	.bo-modal-close {
		background: transparent;
		border: 0;
		border-radius: 8px;
		font-size: 1.7rem;
		cursor: pointer;
		min-width: 36px;
		min-height: 36px;
	}
	.bo-modal-close:hover {
		background: #f3f5f8;
	}
	.bo-modal-close:focus-visible {
		outline: 2px solid #2457d6;
	}
	.bo-modal-body {
		padding: 24px;
		overflow-y: auto;
	}
</style>
