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

type NavigationModule = { boNavigation?: BoNavigationItem };
const discovered = import.meta.glob<NavigationModule>('../modules/*/navigation.ts', { eager: true });

export function declaredBoNavigation(): BoNavigationItem[] {
  return Object.values(discovered)
    .map((module) => module.boNavigation)
    .filter((entry): entry is BoNavigationItem =>
      entry !== undefined && entry.path.startsWith('/') &&
      entry.probe.startsWith('/apibo/') && !!entry.resource && !!entry.action &&
      !!entry.label?.fr && !!entry.label?.en
    )
    .sort((a, b) => a.path.localeCompare(b.path));
}

export async function availableBoNavigation(
  entries: readonly BoNavigationItem[],
  check: (probe: string) => Promise<unknown>
): Promise<BoNavigationItem[]> {
  const inspected = await Promise.all(entries.map(async (entry) => {
    try {
      await check(entry.probe);
      return entry;
    } catch {
      return null;
    }
  }));
  return inspected.filter((entry): entry is BoNavigationItem => entry !== null);
}
