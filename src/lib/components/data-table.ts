import type { PageSize } from './pagination';

export type DataRow = Record<string, unknown>;
export type SortOrder = 'asc' | 'desc';

export type DataColumn<T extends object> = {
	key: string;
	label: string;
	sortable?: boolean;
	align?: 'left' | 'center' | 'right';
	format?: (value: unknown, row: T) => string;
};

export type DataAction<T extends object> = {
	key: string;
	label: string | ((row: T) => string);
	onClick: (row: T) => void;
	disabled?: (row: T) => boolean;
};

export type DataFilter = {
	key: string;
	label: string;
	type: 'search' | 'select';
	placeholder?: string;
	options?: { value: string; label: string }[];
};

export type DataTablePagination = {
	page: number;
	limit: PageSize;
	total: number;
	onPageChange: (page: number) => void;
	onLimitChange: (limit: PageSize) => void;
};

export function nextSort(
	key: string,
	currentKey: string | null,
	currentOrder: SortOrder
): { key: string; order: SortOrder } {
	return { key, order: key === currentKey && currentOrder === 'asc' ? 'desc' : 'asc' };
}

export function displayCell<T extends object>(
	column: DataColumn<T>,
	row: T,
	booleanLabels: { yes: string; no: string } = { yes: 'Oui', no: 'Non' }
): string {
	const value = (row as Record<string, unknown>)[column.key];
	if (column.format) return column.format(value, row);
	if (value === null || value === undefined) return '';
	if (typeof value === 'boolean') return value ? booleanLabels.yes : booleanLabels.no;
	if (typeof value === 'object') return '';
	return String(value);
}
