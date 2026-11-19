import { describe, expect, it } from 'vitest';
import { isPublicBoRoute } from './public-routes';

describe('Public BO profile confirmation', () => {
	it('lets a user confirm an email without an authenticated shell', () => {
		expect(isPublicBoRoute('/verify-email-change')).toBe(true);
		expect(isPublicBoRoute('/profile')).toBe(false);
	});
});
