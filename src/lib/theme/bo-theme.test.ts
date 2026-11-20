import { describe, expect, it } from 'vitest';
import { isBoThemePreference, resolvedBoTheme } from './bo-theme';

describe('BO theme preference', () => {
	it('only accepts system, light and dark', () => {
		expect(['system', 'light', 'dark'].every(isBoThemePreference)).toBe(true);
		expect(isBoThemePreference(null)).toBe(false);
		expect(isBoThemePreference('other')).toBe(false);
	});
	it('resolves system preference and explicit overrides', () => {
		expect(resolvedBoTheme('system', true)).toBe('dark');
		expect(resolvedBoTheme('system', false)).toBe('light');
		expect(resolvedBoTheme('light', true)).toBe('light');
		expect(resolvedBoTheme('dark', false)).toBe('dark');
	});
});
