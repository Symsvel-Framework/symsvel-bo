import { describe, expect, it, vi } from 'vitest';
import {
	availableBoNavigation,
	availableBoSystemAlerts,
	declaredBoNavigation,
	type BoNavigationItem
} from './navigation';

const entries: BoNavigationItem[] = [
	{
		path: '/admins',
		label: { fr: 'Administrateurs', en: 'Administrators' },
		resource: 'admins',
		action: 'list',
		probe: '/apibo/admins'
	},
	{
		path: '/users',
		label: { fr: 'Utilisateurs', en: 'Users' },
		resource: 'users',
		action: 'list',
		probe: '/apibo/users'
	}
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
		expect(
			await availableBoNavigation(entries, async () => {
				throw new Error('network');
			})
		).toEqual([]);
	});
});

describe('module-owned system alerts', () => {
	it('does not load alerts from a forbidden module', async () => {
		const load = vi.fn(async () => [
			{ id: 'missing', path: '/users', message: { fr: 'Manquant', en: 'Missing' } }
		]);
		expect(
			await availableBoSystemAlerts([entries[0]], async <T>() => ({} as T), [
				{ boNavigation: entries[1], boAlerts: load }
			])
		).toEqual([]);
		expect(load).not.toHaveBeenCalled();
	});
	it('keeps only alerts from the authorized owner', async () => {
		const alerts = await availableBoSystemAlerts(entries, async <T>() => ({} as T), [
			{
				boNavigation: entries[0],
				boAlerts: async () => [
					{ id: 'ok', path: '/admins', message: { fr: 'Oui', en: 'Yes' } },
					{ id: 'wrong', path: '/settings', message: { fr: 'Non', en: 'No' } }
				]
			},
			{
				boNavigation: entries[1],
				boAlerts: async () => {
					throw Error('offline');
				}
			}
		]);
		expect(alerts.map((alert) => alert.id)).toEqual(['ok']);
	});
});
