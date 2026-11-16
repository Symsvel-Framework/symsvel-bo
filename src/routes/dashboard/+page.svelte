<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Path } from '$app/types';
	import { uiLanguage } from '../../lib/api/locales';
	import { getBoShell } from '../../lib/bo/context';

	const shell = getBoShell();
	const modules = $derived(shell.modules);
	const language = $derived(($uiLanguage ?? 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');
	const copy = {
		fr: {
			dashboard: 'Tableau de bord',
			session: 'Session BO vérifiée.',
			modules: 'Modules disponibles',
			detected: 'Modules détectés dans ce build',
			loading: 'Chargement des modules autorisés…',
			missingBuild: 'Aucune navigation modulaire détectée dans ce build BO.',
			unavailable: 'Modules détectés, mais aucun endpoint de lecture autorisé ou disponible.'
		},
		en: {
			dashboard: 'Dashboard',
			session: 'BO session verified.',
			modules: 'Available modules',
			detected: 'Modules detected in this build',
			loading: 'Checking permitted modules…',
			missingBuild: 'No installed module navigation detected in this BO build.',
			unavailable: 'Modules were detected, but no read endpoint was permitted or available.'
		}
	};
	const t = $derived(copy[language]);
</script>

<svelte:head><title>{t.dashboard} | SymSvel BO</title></svelte:head>

<section class="welcome">
	<h1>{t.dashboard}</h1>
	<p>{t.session}</p>
	<section aria-label={t.modules} class="modules">
		<h2>{t.modules}</h2>
		<p>{t.detected}: {shell.detectedModules}</p>
		{#if shell.modulesPending}
			<p role="status">{t.loading}</p>
		{:else if modules.length === 0}
			<p role="status">{shell.detectedModules === 0 ? t.missingBuild : t.unavailable}</p>
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
</style>
