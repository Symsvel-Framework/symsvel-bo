export type DropdownOption = {
	value: string;
	label: string;
	code?: string;
	icon?: string;
};

export function selectedDropdownIndex(options: readonly DropdownOption[], value: string): number {
	return options.findIndex((option) => option.value === value);
}

export function nextDropdownIndex(length: number, current: number, key: string): number {
	if (length <= 0) return -1;
	if (key === 'Home') return 0;
	if (key === 'End') return length - 1;
	if (key === 'ArrowDown') return (current + 1 + length) % length;
	if (key === 'ArrowUp') return (current - 1 + length) % length;
	return Math.max(0, Math.min(current, length - 1));
}

/** Explicit locale-to-country mapping, taken from the HP BO source. */
const countryByLanguage: Record<string, string> = {
	fr: 'FR', en: 'GB', it: 'IT', es: 'ES', de: 'DE',
	pt: 'PT', nl: 'NL', pl: 'PL', sv: 'SE'
};

export function languageFlag(locale: string): string {
	const code = locale.trim().replace('_', '-').split('-')[0].toLowerCase();
	const country = countryByLanguage[code];
	if (!country) return '🌐';
	return String.fromCodePoint(...[...country].map((letter) => letter.charCodeAt(0) - 65 + 0x1f1e6));
}
