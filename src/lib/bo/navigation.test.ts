import { describe, expect, it, vi } from 'vitest';
import { availableBoNavigation, declaredBoNavigation, type BoNavigationItem } from './navigation';

const entries: BoNavigationItem[] = [
  { path: '/admins', label: { fr: 'Administrateurs', en: 'Administrators' },
    resource: 'admins', action: 'list', probe: '/apibo/admins' },
  { path: '/users', label: { fr: 'Utilisateurs', en: 'Users' },
    resource: 'users', action: 'list', probe: '/apibo/users' }
];

describe('module-owned BO navigation', () => {
  it('does not require a fixed module list', () => {
    expect(Array.isArray(declaredBoNavigation())).toBe(true);
  });
  it('only exposes modules authorized by their read-only API', async () => {
    const check = vi.fn(async (probe: string) => {
      if (probe === '/apibo/users') throw new Error('403');
      return { data: [] };
    });
    const visible = await availableBoNavigation(entries, check);
    expect(visible.map((item) => item.path)).toEqual(['/admins']);
    expect(check).toHaveBeenCalledTimes(2);
  });
  it('hides links after an unavailable or denied check', async () => {
    expect(await availableBoNavigation(entries, async () => { throw new Error('network'); })).toEqual([]);
  });
});
