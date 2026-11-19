export type BoThemePreference = 'system' | 'light' | 'dark';
export type BoTheme = 'light' | 'dark';

const STORAGE_KEY = 'symsvel.bo.theme';

export function isBoThemePreference(value: unknown): value is BoThemePreference {
	return value === 'system' || value === 'light' || value === 'dark';
}

export function resolvedBoTheme(preference: BoThemePreference, systemDark: boolean): BoTheme {
	return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}

export function readBoThemePreference(): BoThemePreference {
	if (typeof window === 'undefined') return 'system';
	try {
		const choice = window.localStorage.getItem(STORAGE_KEY);
		return isBoThemePreference(choice) ? choice : 'system';
	} catch {
		return 'system';
	}
}

export function applyBoTheme(preference: BoThemePreference): void {
	if (typeof window === 'undefined') return;
	const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
	document.documentElement.dataset.theme = resolvedBoTheme(preference, systemDark);
}

export function saveBoThemePreference(preference: BoThemePreference): void {
	if (typeof window === 'undefined') return;
	try {
		if (preference === 'system') window.localStorage.removeItem(STORAGE_KEY);
		else window.localStorage.setItem(STORAGE_KEY, preference);
	} catch {
		// Storage can be unavailable. The visual choice still applies in this tab.
	}
	applyBoTheme(preference);
}

export function installBoTheme(): () => void {
	if (typeof window === 'undefined') return () => {};
	const media = window.matchMedia?.('(prefers-color-scheme: dark)');
	const refresh = () => applyBoTheme(readBoThemePreference());
	const onStorage = (event: StorageEvent) => {
		if (event.key === STORAGE_KEY || event.key === null) refresh();
	};
	refresh();
	media?.addEventListener('change', refresh);
	window.addEventListener('storage', onStorage);
	return () => {
		media?.removeEventListener('change', refresh);
		window.removeEventListener('storage', onStorage);
	};
}
