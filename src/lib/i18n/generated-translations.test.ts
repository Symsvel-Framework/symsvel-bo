import { describe, expect, it } from 'vitest';
import { generatedTranslation, lookupGeneratedDictionary } from './generated-translations';

describe('generated translations', () => {
	it('resolves nested keys and rejects unsupported values', () => {
		const dictionary = { auth: { signIn: 'Connexion', count: 5 } };
		expect(lookupGeneratedDictionary(dictionary, 'auth.signIn')).toBe('Connexion');
		expect(lookupGeneratedDictionary(dictionary, 'auth.count')).toBeNull();
		expect(lookupGeneratedDictionary(dictionary, 'auth.unknown')).toBeNull();
		expect(lookupGeneratedDictionary(dictionary, '../unsafe')).toBeNull();
	});
	it('does not require generated files to exist for an initial build', () => {
		expect(generatedTranslation('fr', 'nonexistent.testing')).toBeNull();
		expect(generatedTranslation('fr', 'bo.system.first')).toBe('Première page');
		expect(generatedTranslation('en', 'bo.system.next')).toBe('Next page');
		expect(generatedTranslation('fr', 'bo.system.page')).toBe('Page {current} / {total}');
		expect(generatedTranslation('fr', 'bo.system.dashboard.modules')).toBe('Modules disponibles');
		expect(generatedTranslation('en', 'bo.system.dashboard.dashboard')).toBe('Dashboard');
		expect(generatedTranslation('fr', 'bo.system.shell.navigation')).toBe('Navigation principale');
		expect(generatedTranslation('en', 'bo.system.shell.alerts')).toBe('System alerts');
	});
});
