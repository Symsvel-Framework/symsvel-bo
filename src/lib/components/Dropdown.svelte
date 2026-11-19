<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { nextDropdownIndex, selectedDropdownIndex, type DropdownOption } from './dropdown';

	let {
		value,
		options,
		label,
		onChange,
		disabled = false,
		placeholder = '—'
	}: {
		value: string;
		options: DropdownOption[];
		label: string;
		onChange: (value: string) => void;
		disabled?: boolean;
		placeholder?: string;
	} = $props();

	const listId = $props.id();
	let root: HTMLDivElement;
	let trigger: HTMLButtonElement;
	let open = $state(false);
	let highlighted = $state(0);
	const selected = $derived(options.find((option) => option.value === value));

	onMount(() => {
		const closeOutside = (event: PointerEvent) => {
			if (root && !root.contains(event.target as Node)) open = false;
		};
		document.addEventListener('pointerdown', closeOutside);
		return () => document.removeEventListener('pointerdown', closeOutside);
	});

	async function focusOption(): Promise<void> {
		await tick();
		root?.querySelector<HTMLButtonElement>('[data-dropdown-index="' + highlighted + '"]')?.focus();
	}

	function openAt(index: number): void {
		if (disabled || options.length === 0) return;
		highlighted = Math.max(0, Math.min(index, options.length - 1));
		open = true;
		void focusOption();
	}

	function toggle(): void {
		if (open) open = false;
		else openAt(Math.max(0, selectedDropdownIndex(options, value)));
	}

	function choose(option: DropdownOption): void {
		open = false;
		if (option.value !== value) onChange(option.value);
		trigger?.focus();
	}

	function triggerKeydown(event: KeyboardEvent): void {
		if (disabled) return;
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			const index = selectedDropdownIndex(options, value);
			openAt(nextDropdownIndex(options.length, index < 0 ? 0 : index, event.key));
		} else if (event.key === 'Home' || event.key === 'End') {
			event.preventDefault();
			openAt(nextDropdownIndex(options.length, 0, event.key));
		}
	}

	function menuKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			open = false;
			trigger?.focus();
		} else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
			event.preventDefault();
			event.stopPropagation();
			highlighted = nextDropdownIndex(options.length, highlighted, event.key);
			void focusOption();
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			event.stopPropagation();
			if (options[highlighted]) choose(options[highlighted]);
		} else if (event.key === 'Tab') {
			open = false;
		}
	}
</script>

<div class="bo-dropdown" bind:this={root}>
	<button
		bind:this={trigger}
		type="button"
		class="bo-dropdown__trigger"
		{disabled}
		aria-label={label}
		aria-haspopup="listbox"
		aria-controls={listId}
		aria-expanded={open}
		onclick={toggle}
		onkeydown={triggerKeydown}
	>
		<span class="bo-dropdown__main">
			{#if selected?.icon}<span aria-hidden="true" class="bo-dropdown__icon">{selected.icon}</span>{/if}
			<span class="bo-dropdown__label">{selected?.label ?? placeholder}</span>
		</span>
		<span class="bo-dropdown__meta">
			{#if selected?.code}<span class="bo-dropdown__code">{selected.code}</span>{/if}
			<span aria-hidden="true" class="bo-dropdown__chevron">▾</span>
		</span>
	</button>
	{#if open}
		<div id={listId} class="bo-dropdown__menu" role="listbox" tabindex="-1" aria-label={label} onkeydown={menuKeydown}>
			{#each options as option, index (option.value)}
				<button
					type="button"
					class="bo-dropdown__option"
					class:active={option.value === value}
					role="option"
					aria-selected={option.value === value}
					tabindex={index === highlighted ? 0 : -1}
					data-dropdown-index={index}
					onfocus={() => (highlighted = index)}
					onclick={() => choose(option)}
				>
					<span class="bo-dropdown__main">
						{#if option.icon}<span aria-hidden="true" class="bo-dropdown__icon">{option.icon}</span>{/if}
						<span class="bo-dropdown__label">{option.label}</span>
					</span>
					{#if option.code}<span class="bo-dropdown__code">{option.code}</span>{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.bo-dropdown { position: relative; width: 100%; min-width: 0; }
	.bo-dropdown__trigger {
		display: flex; align-items: center; justify-content: space-between;
		gap: 14px; width: 100%; min-height: 44px; padding: 0 14px;
		border: 1px solid var(--bo-border, #b8c1cc);
		border-radius: 14px; background: var(--bo-surface-muted, #f6f8fa);
		color: var(--bo-text, #0f2a38); cursor: pointer; text-align: left;
		font: inherit; transition: background 120ms, border-color 120ms;
	}
	.bo-dropdown__trigger:hover:not(:disabled),
	.bo-dropdown__trigger[aria-expanded='true'] {
		background: var(--bo-surface, #fff);
		border-color: var(--bo-primary, #1fa6a6);
	}
	.bo-dropdown__trigger:disabled { opacity: 0.55; cursor: not-allowed; }
	.bo-dropdown__trigger:focus-visible, .bo-dropdown__option:focus-visible {
		outline: 2px solid var(--bo-focus, #1fa6a6); outline-offset: 2px;
	}
	.bo-dropdown__main { display: inline-flex; align-items: center; gap: 9px; min-width: 0; }
	.bo-dropdown__icon { flex-shrink: 0; font-size: 1.15rem; line-height: 1; }
	.bo-dropdown__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.91rem; font-weight: 650; }
	.bo-dropdown__meta { display: inline-flex; align-items: center; gap: 12px; flex-shrink: 0; }
	.bo-dropdown__code { color: var(--bo-muted, #667085); font-size: 0.76rem; font-weight: 800; letter-spacing: 0.04em; }
	.bo-dropdown__chevron { color: var(--bo-muted, #667085); font-size: 0.85rem; }
	.bo-dropdown__menu {
		position: absolute; z-index: 50; top: calc(100% + 7px); right: 0;
		min-width: 100%; max-height: min(320px, 55vh); overflow: auto;
		padding: 5px; border: 1px solid var(--bo-border, #b8c1cc);
		border-radius: 14px; background: var(--bo-surface, #fff);
		box-shadow: var(--bo-shadow, 0 16px 44px rgba(0, 0, 0, 0.24));
	}
	.bo-dropdown__option {
		display: flex; align-items: center; justify-content: space-between;
		gap: 14px; width: 100%; min-height: 42px; padding: 9px 10px;
		border: 0; border-radius: 8px; background: transparent;
		color: var(--bo-text, #0f2a38); cursor: pointer; font: inherit; text-align: left;
	}
	.bo-dropdown__option:hover, .bo-dropdown__option:focus-visible {
		background: var(--bo-surface-muted, #f4f6f8);
	}
	.bo-dropdown__option.active {
		color: var(--bo-primary, #1fa6a6);
		background: var(--bo-surface-muted, #f4f6f8);
	}
</style>
