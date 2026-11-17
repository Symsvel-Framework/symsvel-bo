import { get, writable } from 'svelte/store';

const languagePattern = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;

export function normalizeLanguage(value: string | null | undefined): string | null {
	const normalized = value?.trim().replace(/_/g, '-');
	return normalized && languagePattern.test(normalized) ? normalized.toLowerCase() : null;
}

function browserLanguage(): string {
	return typeof navigator === 'undefined' ? 'fr' : (normalizeLanguage(navigator.language) ?? 'fr');
}

export const uiLanguage = writable<string | null>(null);
export const translationLanguage = writable<string | null>(null);

export function setUiLanguage(value: string | null | undefined): void {
	uiLanguage.set(normalizeLanguage(value));
}

export function setTranslationLanguage(value: string | null | undefined): void {
	translationLanguage.set(normalizeLanguage(value));
}

export type ApiLocaleOptions = {
	skipLocales?: boolean;
	uiLang?: string;
	translationLang?: string;
};

export function localizedApiPath(path: string, options: ApiLocaleOptions = {}): string {
	if (options.skipLocales) return path;
	const uiLang = normalizeLanguage(options.uiLang) ?? get(uiLanguage) ?? browserLanguage();
	const translationLang =
		normalizeLanguage(options.translationLang) ?? get(translationLanguage) ?? uiLang;
	const [withoutHash, hash] = path.split('#', 2);
	const [pathname, query = ''] = withoutHash.split('?', 2);
	const params = new URLSearchParams(query);
	if (!params.has('ui_lang')) params.set('ui_lang', uiLang);
	if (!params.has('translation_lang')) params.set('translation_lang', translationLang);
	return `${pathname}?${params.toString()}${hash === undefined ? '' : `#${hash}`}`;
}
