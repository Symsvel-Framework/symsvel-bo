<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		kind = 'error',
		children
	}: {
		kind?: 'error' | 'success' | 'info';
		children: Snippet;
	} = $props();
</script>

<div class={`bo-alert bo-alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
	{@render children()}
</div>
