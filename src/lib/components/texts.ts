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
	return language?.toLowerCase().split('-')[0] === 'en' ? copy.en : copy.fr;
}
