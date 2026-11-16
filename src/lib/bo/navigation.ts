/**
 * The host discovers only installed BO modules; it does not own their routes.
 * A module link is visible only when its read-only ACL-protected API succeeds.
 */
export type BoNavigationItem = {
	path: string;
	label: { fr: string; en: string };
	resource: string;
	action: string;
	probe: string;
};

export type BoSystemAlert = {
	id: string;
	path: string;
	message: { fr: string; en: string };
};
export type BoAlertLoader = (check: <T>(path: string) => Promise<T>) => Promise<BoSystemAlert[]>;
type NavigationModule = { boNavigation?: BoNavigationItem; boAlerts?: BoAlertLoader };
const discovered = import.meta.glob<NavigationModule>('../modules/*/navigation.ts', {
	eager: true
});

export function declaredBoNavigation(): BoNavigationItem[] {
	return Object.values(discovered)
		.map((module) => module.boNavigation)
		.filter(
			(entry): entry is BoNavigationItem =>
				entry !== undefined &&
				entry.path.startsWith('/') &&
				entry.probe.startsWith('/apibo/') &&
				!!entry.resource &&
				!!entry.action &&
				!!entry.label?.fr &&
				!!entry.label?.en
		)
		.sort((a, b) => a.path.localeCompare(b.path));
}

export async function availableBoNavigation(
	entries: readonly BoNavigationItem[],
	check: (probe: string) => Promise<unknown>
): Promise<BoNavigationItem[]> {
	const inspected = await Promise.all(
		entries.map(async (entry) => {
			try {
				await check(entry.probe);
				return entry;
			} catch {
				return null;
			}
		})
	);
	return inspected.filter((entry): entry is BoNavigationItem => entry !== null);
}

/** Only installed and permitted modules may contribute system alerts. */
export async function availableBoSystemAlerts(
	allowed: readonly BoNavigationItem[],
	check: <T>(path: string) => Promise<T>,
	modules: readonly NavigationModule[] = Object.values(discovered)
): Promise<BoSystemAlert[]> {
	const paths = new Set(allowed.map((entry) => entry.path));
	const providers = modules.filter(
		(module) => module.boNavigation && paths.has(module.boNavigation.path) && module.boAlerts
	);
	const results = await Promise.all(
		providers.map(async (module) => {
			try {
				const alerts = await module.boAlerts!(check);
				return alerts.filter(
					(alert) =>
						alert.path === module.boNavigation!.path &&
						Boolean(alert.id && alert.message?.fr && alert.message?.en)
				);
			} catch {
				return [];
			}
		})
	);
	return results.flat();
}
