<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		// Fail closed until the Auth integration can verify a BO session.
		void goto('/login', { replaceState: true });
	});
</script>

<svelte:head><title>Dashboard | SymSvel BO</title></svelte:head>
<div class="bo-shell">
	<aside class="bo-sidebar"><div class="bo-brand">SymSvel BO</div></aside>
	<div class="bo-main"><header class="bo-topbar"></header><main class="bo-content"><section class="welcome"><h1>Dashboard</h1><p>Authentification requise.</p></section></main></div>
</div>
