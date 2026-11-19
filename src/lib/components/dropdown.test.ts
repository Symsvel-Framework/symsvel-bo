import { describe, expect, it } from 'vitest';
import { languageFlag, nextDropdownIndex, selectedDropdownIndex } from './dropdown';

describe('BO dropdown (HP UX)', () => {
	const options = [{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }];
	it('preserves controlled selection without implicit value', () => {
		expect(selectedDropdownIndex(options, 'en')).toBe(1);
		expect(selectedDropdownIndex(options, 'xx')).toBe(-1);
	});
	it('handles keyboard arrow, home, end and empty list', () => {
		expect(nextDropdownIndex(2, 0, 'ArrowDown')).toBe(1);
		expect(nextDropdownIndex(2, 1, 'ArrowDown')).toBe(0);
		expect(nextDropdownIndex(2, 0, 'ArrowUp')).toBe(1);
		expect(nextDropdownIndex(2, 1, 'Home')).toBe(0);
		expect(nextDropdownIndex(2, 0, 'End')).toBe(1);
		expect(nextDropdownIndex(0, 0, 'ArrowDown')).toBe(-1);
	});
	it('reuses HP flag mapping and shows neutral fallback', () => {
		expect(languageFlag('fr-FR')).toBe('🇫🇷');
		expect(languageFlag('en_US')).toBe('🇬🇧');
		expect(languageFlag('sv')).toBe('🇸🇪');
		expect(languageFlag('eo')).toBe('🌐');
	});
});
