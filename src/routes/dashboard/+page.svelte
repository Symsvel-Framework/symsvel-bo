<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { currentBo, logoutBo } from '../../lib/api/session';

	let authorized = $state(false);
	let adminId = $state<number | null>(null);

	onMount(() => {
		let active = true;
		void currentBo().then((identity) => {
			if (!active) return;
			if (!identity) {
				void goto(resolve('/login'), { replaceState: true });
				return;
			}
			adminId = identity.id;
			authorized = true;
		});
		return () => {
			active = false;
		};
	});

	async function logout() {
		authorized = false;
		await logoutBo();
		await goto(resolve('/login'), { replaceState: true });
	}
</script>

<svelte:head><title>Dashboard | SymSvel BO</title></svelte:head>
{#if authorized}
	<div class="bo-shell">
		<aside class="bo-sidebar"><div class="bo-brand">SymSvel BO</div></aside>
		<div class="bo-main">
			<header class="bo-topbar">
				<span>Administrateur #{adminId}</span>
				<button type="button" onclick={logout}>Déconnexion</button>
			</header>
			<main class="bo-content">
				<section class="welcome">
					<h1>Dashboard</h1>
					<p>Session BO vérifiée.</p>
				</section>
			</main>
		</div>
	</div>
{:else}
	<main class="auth-shell"><p>Vérification de la session…</p></main>
{/if}
