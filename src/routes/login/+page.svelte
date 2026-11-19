<script lang="ts">
	import { ApiError } from '../../lib/api/client';
	import { onMount } from 'svelte';
	import { publicProjectName } from '../../lib/branding';
	import { loginBo, SecondFactorRequired } from '../../lib/api/session';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { uiLanguage } from '../../lib/api/locales';
	import { generatedTranslation } from '../../lib/i18n/generated-translations';

	// Auth owns the sign-in words even though this native route lives in BO.
	const t = $derived({
		title: generatedTranslation($uiLanguage, 'bo.auth.signIn.title') ?? 'Connexion',
		intro:
			generatedTranslation($uiLanguage, 'bo.auth.signIn.intro') ??
			'Connectez-vous à l’administration.',
		email: generatedTranslation($uiLanguage, 'bo.auth.signIn.email') ?? 'Adresse e-mail',
		password: generatedTranslation($uiLanguage, 'bo.auth.signIn.password') ?? 'Mot de passe',
		busy: generatedTranslation($uiLanguage, 'bo.auth.signIn.busy') ?? 'Connexion…',
		submit: generatedTranslation($uiLanguage, 'bo.auth.signIn.submit') ?? 'Se connecter',
		invalidCredentials:
			generatedTranslation($uiLanguage, 'bo.auth.signIn.invalidCredentials') ??
			'Identifiants incorrects.',
		failure:
			generatedTranslation($uiLanguage, 'bo.auth.signIn.failure') ??
			'Connexion impossible pour le moment.'
	});

	let brandName = $state('SymSvel');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	onMount(() => {
		let mounted = true;
		void publicProjectName().then((name) => { if (mounted) brandName = name; });
		return () => { mounted = false; };
	});

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
				// Dynamically supplied by the optional TwoFactor module.
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				await goto(resolve('/').replace(/\/$/, '') + '/two-factor');
				return;
			}

			error = cause instanceof ApiError && cause.status === 401 ? t.invalidCredentials : t.failure;
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{t.title} | {brandName} BO</title>
</svelte:head>

<main class="auth-shell">
	<section class="auth-card" aria-labelledby="login-title">
		<header><strong>{brandName}</strong><span>BO</span></header>
		<h1 id="login-title">{t.title}</h1>
		<p>{t.intro}</p>
		{#if error}<div class="alert" role="alert">{error}</div>{/if}
		<form class="form" onsubmit={submit}>
			<label for="email">{t.email}</label>
			<input id="email" type="email" autocomplete="username" bind:value={email} required />
			<label for="password">{t.password}</label>
			<input
				id="password"
				type="password"
				autocomplete="current-password"
				bind:value={password}
				required
			/>
			<button type="submit" disabled={loading}>{loading ? t.busy : t.submit}</button>
		</form>
	</section>
</main>
