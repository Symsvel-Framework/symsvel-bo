<script lang="ts">
	import { onMount, setContext, type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Path } from '$app/types';
	import { uiLanguage } from '../api/locales';
	import { boApi, currentBo, logoutBo, type BoIdentity } from '../api/session';
	import {
		availableBoNavigation,
		availableBoSystemAlerts,
		declaredBoNavigation,
		type BoNavigationItem,
		type BoSystemAlert
	} from '../bo/navigation';
	import { boShellKey, type BoShellContext } from '../bo/context';
	import { generatedTranslation } from '../i18n/generated-translations';
	import Dropdown from './Dropdown.svelte';
	import { publicProjectName } from '../branding';
	import {
		isBoThemePreference,
		readBoThemePreference,
		saveBoThemePreference,
		type BoThemePreference
	} from '../theme/bo-theme';

	let { children }: { children: Snippet } = $props();
	let identity = $state<BoIdentity | null>(null);
	let modules = $state<BoNavigationItem[]>([]);
	let alerts = $state<BoSystemAlert[]>([]);
	let modulesPending = $state(true);
	let menuOpen = $state(false);
	let alertsOpen = $state(false);
	let themePreference = $state<BoThemePreference>('system');
	let brandName = $state('SymSvel');
	const detectedModules = declaredBoNavigation().length;
	const language = $derived(($uiLanguage ?? 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');
	const copy = {
		fr: {
			dashboard: 'Tableau de bord',
			modules: 'Modules',
			navigation: 'Navigation principale',
			account: 'Menu administrateur',
			profile: 'Mon profil',
			administrator: 'Administrateur',
			logout: 'Déconnexion',
			alerts: 'Alertes système',
			checking: 'Vérification de la session…',
			loading: 'Chargement des modules autorisés…',
			theme: 'Apparence',
			themeSystem: 'Système',
			themeLight: 'Clair',
			themeDark: 'Sombre'
		},
		en: {
			dashboard: 'Dashboard',
			modules: 'Modules',
			navigation: 'Main navigation',
			account: 'Administrator menu',
			profile: 'My profile',
			administrator: 'Administrator',
			logout: 'Log out',
			alerts: 'System alerts',
			checking: 'Checking session…',
			loading: 'Checking permitted modules…',
			theme: 'Appearance',
			themeSystem: 'System',
			themeLight: 'Light',
			themeDark: 'Dark'
		}
	};
	const t = $derived(
		Object.fromEntries(
			Object.entries(copy[language]).map(([key, fallback]) => {
				const path =
					key === 'logout' || key === 'checking'
						? `bo.auth.session.${key}`
						: key === 'administrator'
							? 'bo.admins.account.administrator'
							: key === 'profile'
								? 'bo.admins.profile.title'
								: `bo.system.shell.${key}`;
				return [key, generatedTranslation($uiLanguage, path) ?? fallback];
			})
		) as typeof copy.fr
	);

	setContext<BoShellContext>(boShellKey, {
		get identity() {
			return identity;
		},
		get modules() {
			return modules;
		},
		get modulesPending() {
			return modulesPending;
		},
		get detectedModules() {
			return detectedModules;
		}
	});

	onMount(() => {
		let mounted = true;
		void publicProjectName().then((name) => { if (mounted) brandName = name; });
		let navigationRevision = 0;
		themePreference = readBoThemePreference();
		const onThemeStorage = () => {
			themePreference = readBoThemePreference();
		};
		window.addEventListener('storage', onThemeStorage);
		// Refresh module alerts after a settings change, without remounting the BO.
		const refreshAlerts = (): void => {
			if (!mounted || !identity) return;
			void availableBoSystemAlerts(modules, boApi).then((found) => {
				if (mounted && identity) alerts = found;
			});
		};
		window.addEventListener('symsvel:alerts-changed', refreshAlerts);
		const refreshNavigation = (): void => {
			if (!mounted || !identity) return;
			const revision = ++navigationRevision;
			void availableBoNavigation(declaredBoNavigation(), (path) => boApi(path)).then((allowed) => {
				if (!mounted || !identity || revision !== navigationRevision) return;
				modules = allowed;
				modulesPending = false;
				refreshAlerts();
			});
		};
		window.addEventListener('symsvel:navigation-changed', refreshNavigation);
		void currentBo()
			.then(async (result) => {
				if (!mounted) return;
				if (!result) {
					await goto(resolve('/login'), { replaceState: true });
					return;
				}
				identity = result;
				const revision = ++navigationRevision;
				const allowed = await availableBoNavigation(declaredBoNavigation(), (path) => boApi(path));
				if (!mounted || revision !== navigationRevision) return;
				modules = allowed;
				modulesPending = false;
				refreshAlerts();
			})
			.catch(() => {
				if (mounted) void goto(resolve('/login'), { replaceState: true });
			});
		return () => {
			mounted = false;
			window.removeEventListener('symsvel:alerts-changed', refreshAlerts);
			window.removeEventListener('symsvel:navigation-changed', refreshNavigation);
			window.removeEventListener('storage', onThemeStorage);
		};
	});

	function active(path: string): boolean {
		return page.url.pathname === path || page.url.pathname.startsWith(path + '/');
	}

	async function logout(): Promise<void> {
		menuOpen = false;
		alertsOpen = false;
		identity = null;
		await logoutBo();
		await goto(resolve('/login'), { replaceState: true });
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape') {
			menuOpen = false;
			alertsOpen = false;
		}
	}}
/>

{#if identity}
	<div class="bo-shell">
		<aside class="bo-sidebar">
			<a class="bo-brand" href={resolve('/dashboard')}><strong>{brandName}</strong><span>BO</span></a>
			<nav class="bo-nav" aria-label={t.navigation}>
				<a
					class:active={active('/dashboard')}
					aria-current={active('/dashboard') ? 'page' : undefined}
					href={resolve('/dashboard')}>{t.dashboard}</a
				>
				{#if modules.length > 0}
					<div class="bo-nav-section">
						<span>{t.modules}</span>
						{#each modules as module (module.path)}
							<a
								class:active={active(module.path)}
								aria-current={active(module.path) ? 'page' : undefined}
								href={resolve(module.path.slice(1) as Path)}>{module.label[language]}</a
							>
						{/each}
					</div>
				{:else if modulesPending}
					<p class="bo-nav-loading" role="status">{t.loading}</p>
				{/if}
			</nav>
		</aside>
		<div class="bo-main">
			<header class="bo-topbar">
				<div class="bo-system-alerts">
					{#if alerts.length > 0}
						<button
							class="bo-alert-trigger"
							type="button"
							aria-label={t.alerts + ': ' + alerts.length}
							aria-expanded={alertsOpen}
							onclick={() => {
								alertsOpen = !alertsOpen;
								menuOpen = false;
							}}
						>
							<span aria-hidden="true">⚠</span> <span>{alerts.length}</span>
						</button>
						{#if alertsOpen}
							<div class="bo-alert-panel" aria-label={t.alerts}>
								<strong>{t.alerts}</strong>
								{#each alerts as alert (alert.id)}
									<a
										href={resolve(alert.path.slice(1) as Path)}
										onclick={() => (alertsOpen = false)}>{alert.message[language]}</a
									>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
				<div class="bo-account">
					<span>{t.administrator} #{identity.id}</span>
					<button
						class="bo-avatar"
						type="button"
						aria-label={t.account}
						aria-expanded={menuOpen}
						onclick={() => {
							menuOpen = !menuOpen;
							alertsOpen = false;
						}}>A</button
					>
					{#if menuOpen}
						<div class="bo-account-menu" aria-label={t.account}>
							<strong>{t.administrator} #{identity.id}</strong>
							<a
								class="bo-profile-link"
								href={resolve('/profile' as Path)}
								onclick={() => (menuOpen = false)}>{t.profile}</a
							>
							<div class="bo-theme-choice">
								<span>{t.theme}</span>
								<Dropdown
									value={themePreference}
									label={t.theme}
									options={[
										{ value: 'system', label: t.themeSystem },
										{ value: 'light', label: t.themeLight },
										{ value: 'dark', label: t.themeDark }
									]}
									onChange={(choice) => {
										if (!isBoThemePreference(choice)) return;
										themePreference = choice;
										saveBoThemePreference(choice);
									}}
								/>
							</div>
							<button type="button" onclick={logout}>{t.logout}</button>
						</div>
					{/if}
				</div>
			</header>
			<main class="bo-content">{@render children()}</main>
		</div>
	</div>
{:else}
	<main class="auth-shell"><p role="status">{t.checking}</p></main>
{/if}
