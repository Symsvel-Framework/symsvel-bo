<script lang="ts">
	import { ApiError } from '../../lib/api/client';
	import { loginBo, SecondFactorRequired } from '../../lib/api/session';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (loading) return;
		loading = true;
		error = '';
		try {
			await loginBo(email, password);
			password = '';
			await goto(resolve('/dashboard'), { replaceState: true });
		} catch (cause) {
			if (cause instanceof SecondFactorRequired) {
				password = '';
				await goto(resolve('/').replace(/\/$/, '') + '/two-factor');
				return;
			}

			error =
				cause instanceof ApiError && cause.status === 401
					? 'Identifiants incorrects.'
					: 'Connexion impossible pour le moment.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Connexion | SymSvel BO</title>
</svelte:head>

<main class="auth-shell">
	<section class="auth-card" aria-labelledby="login-title">
		<header><strong>SymSvel</strong><span>BO</span></header>
		<h1 id="login-title">Connexion</h1>
		<p>Connectez-vous à l’administration.</p>
		{#if error}<div class="alert" role="alert">{error}</div>{/if}
		<form class="form" onsubmit={submit}>
			<label for="email">Adresse e-mail</label>
			<input id="email" type="email" autocomplete="username" bind:value={email} required />
			<label for="password">Mot de passe</label>
			<input
				id="password"
				type="password"
				autocomplete="current-password"
				bind:value={password}
				required
			/>
			<button type="submit" disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</button>
		</form>
	</section>
</main>
