<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Path } from '$app/types';
	import { uiLanguage } from '../../lib/api/locales';
	import { boApi, currentBo, logoutBo } from '../../lib/api/session';
	import {
		availableBoNavigation,
		declaredBoNavigation,
		type BoNavigationItem
	} from '../../lib/bo/navigation';

	let authorized = $state(false);
	let adminId = $state<number | null>(null);
	let loadingModules = $state(false);
	let detectedModules = $state(0);
	let modules = $state<BoNavigationItem[]>([]);
	const language = $derived(($uiLanguage ?? 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');
	const copy = {
		fr: {
			dashboard: 'Tableau de bord',
			session: 'Session BO vérifiée.',
			checking: 'Vérification de la session…',
			modules: 'Modules disponibles',
			loading: 'Chargement des modules autorisés…',
			empty: 'Aucun module accessible pour cette session.',
			missingBuild: 'Aucune navigation modulaire détectée dans ce build BO.',
			unavailable: 'Modules détectés, mais aucun endpoint de lecture autorisé ou disponible.',
			detected: 'Modules détectés dans ce build',
			logout: 'Déconnexion',
			administrator: 'Administrateur'
		},
		en: {
			dashboard: 'Dashboard',
			session: 'BO session verified.',
			checking: 'Checking session…',
			modules: 'Available modules',
			loading: 'Checking permitted modules…',
			empty: 'No modules available for this session.',
			missingBuild: 'No installed module navigation detected in this BO build.',
			unavailable: 'Modules were detected, but no read endpoint was permitted or available.',
			detected: 'Modules detected in this build',
			logout: 'Log out',
			administrator: 'Administrator'
		}
	};
	const t = $derived(copy[language]);

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
			loadingModules = true;
			const declared = declaredBoNavigation();
			detectedModules = declared.length;
			void availableBoNavigation(declared, (probe) => boApi(probe))
				.then((allowed) => {
					if (active) modules = allowed;
				})
				.finally(() => {
					if (active) loadingModules = false;
				});
		});
		return () => {
			active = false;
		};
	});

	async function logout(): Promise<void> {
		authorized = false;
		await logoutBo();
		await goto(resolve('/login'), { replaceState: true });
	}
</script>

<svelte:head><title>{t.dashboard} | SymSvel BO</title></svelte:head>
{#if authorized}
	<div class="bo-shell">
		<aside class="bo-sidebar">
			<div class="bo-brand">SymSvel BO</div>
			{#if modules.length > 0}
				<nav aria-label={t.modules} class="module-navigation">
					{#each modules as module (module.path)}
						<a href={resolve(module.path.slice(1) as Path)}>{module.label[language]}</a>
					{/each}
				</nav>
			{/if}
		</aside>
		<div class="bo-main">
			<header class="bo-topbar">
				<span>{t.administrator} #{adminId}</span>
				<button type="button" onclick={logout}>{t.logout}</button>
			</header>
			<main class="bo-content">
				<section class="welcome">
					<h1>{t.dashboard}</h1>
					<p>{t.session}</p>
					<section aria-label={t.modules} class="modules">
						<h2>{t.modules}</h2>
						<p>{t.detected}: {detectedModules}</p>
						{#if loadingModules}
							<p role="status">{t.loading}</p>
						{:else if modules.length === 0}
							<p role="status">{detectedModules === 0 ? t.missingBuild : t.unavailable}</p>
						{:else}
							<div class="module-cards">
								{#each modules as module (module.path)}
									<a href={resolve(module.path.slice(1) as Path)} class="module-card"
										>{module.label[language]}</a
									>
								{/each}
							</div>
						{/if}
					</section>
				</section>
			</main>
		</div>
	</div>
{:else}
	<main class="auth-shell"><p role="status">{t.checking}</p></main>
{/if}

<style>
	.welcome {
		min-height: calc(100vh - 128px);
	}
	.welcome h1 {
		font-size: clamp(2rem, 7vw, 4rem);
	}
	.modules {
		margin: 30px auto 0;
		width: min(100%, 800px);
		text-align: left;
	}
	.modules h2 {
		font-size: 1.15rem;
	}
	.module-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 14px;
	}
	.module-card {
		display: block;
		border: 1px solid #d4dce8;
		background: white;
		padding: 20px;
		border-radius: 12px;
		font-weight: 700;
		text-decoration: none;
		color: #18202b;
	}
	.module-card:hover,
	.module-card:focus-visible {
		border-color: #2457d6;
		background: #f4f7ff;
	}
	.module-navigation {
		display: grid;
		gap: 6px;
		margin-top: 30px;
	}
	.module-navigation a {
		color: #dce3ec;
		padding: 10px 12px;
		border-radius: 8px;
		text-decoration: none;
	}
	.module-navigation a:hover,
	.module-navigation a:focus-visible {
		background: #2b3748;
		color: white;
	}
</style>
