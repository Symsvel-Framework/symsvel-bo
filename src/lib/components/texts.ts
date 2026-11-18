import { generatedTranslation } from '../i18n/generated-translations';

/** BO UI primitives use the same interface-language store as the host shell. */
const copy = {
	fr: {
		wait: 'Patientez…',
		loading: 'Chargement…',
		empty: 'Aucun résultat',
		all: 'Tous',
		actions: 'Actions',
		filters: 'Filtres du tableau',
		pagination: 'Pagination',
		perPage: 'Lignes par page',
		count: (first: number, last: number, total: number) =>
			`${first}–${last} sur ${total} résultats`,
		page: (current: number, total: number) => `Page ${current} / ${total}`,
		first: 'Première page',
		previous: 'Page précédente',
		next: 'Page suivante',
		last: 'Dernière page',
		yes: 'Oui',
		no: 'Non'
	},
	en: {
		wait: 'Please wait…',
		loading: 'Loading…',
		empty: 'No results',
		all: 'All',
		filters: 'Table filters',
		actions: 'Actions',
		pagination: 'Pagination',
		perPage: 'Rows per page',
		count: (first: number, last: number, total: number) => `${first}–${last} of ${total} results`,
		page: (current: number, total: number) => `Page ${current} / ${total}`,
		first: 'First page',
		previous: 'Previous page',
		next: 'Next page',
		last: 'Last page',
		yes: 'Yes',
		no: 'No'
	}
};
export function boComponentCopy(language: string | null | undefined) {
	const base = language?.toLowerCase().split('-')[0] === 'en' ? copy.en : copy.fr;
	const entries = Object.entries(base).map(([key, value]) => {
		if (typeof value !== 'string') return [key, value];
		return [key, generatedTranslation(language, `bo.system.${key}`) ?? value];
	});
	const result = Object.fromEntries(entries) as typeof copy.fr;
	const countPattern = generatedTranslation(language, 'bo.system.count');
	if (countPattern !== null) {
		result.count = (first, last, total) => countPattern.replace(/\{(first|last|total)\}/g, (_, part: string) =>
			String(({ first, last, total } as Record<string, number>)[part]));
	}
	const pagePattern = generatedTranslation(language, 'bo.system.page');
	if (pagePattern !== null) {
		result.page = (current, total) => pagePattern.replace(/\{(current|total)\}/g, (_, part: string) =>
			String(({ current, total } as Record<string, number>)[part]));
	}
	return result;
}
