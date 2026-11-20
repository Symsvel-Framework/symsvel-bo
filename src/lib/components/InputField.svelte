<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		id,
		label,
		value = $bindable(''),
		type = 'text',
		...rest
	}: HTMLInputAttributes & {
		id: string;
		label: string;
		value?: string;
	} = $props();
</script>

<label class="bo-field" for={id}>
	<span>{label}</span>
	<input {...rest} {id} {type} bind:value />
</label>
