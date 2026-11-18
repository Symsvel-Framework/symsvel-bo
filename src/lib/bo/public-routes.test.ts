import { describe, expect, it } from 'vitest';
import { isPublicBoRoute } from './public-routes';

describe('BO routes available before authentication', () => {
	it.each(['/', '/login', '/auth/activate', '/auth/recover', '/two-factor'])(
		'renders %s without the authenticated shell',
		(path) => {
			expect(isPublicBoRoute(path)).toBe(true);
		}
	);

	it.each(['/dashboard', '/admins', '/users', '/two-factor/extra', '/two-factor-bypass'])(
		'keeps %s behind the authenticated shell',
		(path) => {
			expect(isPublicBoRoute(path)).toBe(false);
		}
	);
});
