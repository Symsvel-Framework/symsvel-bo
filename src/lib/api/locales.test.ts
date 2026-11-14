import { beforeEach, describe, expect, it } from 'vitest';
import { localizedApiPath, setTranslationLanguage, setUiLanguage } from './locales';

describe('localizedApiPath', () => {
	beforeEach(() => {
		setUiLanguage('fr');
		setTranslationLanguage(null);
	});
	it('adds both languages and defaults translation to UI language', () => {
		expect(localizedApiPath('/apibo/admins')).toBe(
			'/apibo/admins?ui_lang=fr&translation_lang=fr'
		);
	});
	it('keeps a separate translation language', () => {
		setTranslationLanguage('de');
		expect(localizedApiPath('/apibo/admins')).toContain('translation_lang=de');
	});
	it('preserves explicit query values and fragments', () => {
		expect(localizedApiPath('/apibo/test?ui_lang=it&page=2#section')).toBe(
			'/apibo/test?ui_lang=it&page=2&translation_lang=fr#section'
		);
	});
	it('supports overrides and bypass', () => {
		expect(localizedApiPath('/apiopen/languages', { uiLang: 'en', translationLang: 'es' })).toBe(
			'/apiopen/languages?ui_lang=en&translation_lang=es'
		);
		expect(localizedApiPath('/apiopen/languages', { skipLocales: true })).toBe(
			'/apiopen/languages'
		);
	});
});
