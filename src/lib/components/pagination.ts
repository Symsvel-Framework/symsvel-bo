export const PAGE_SIZES = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export type PaginationState = {
	page: number;
	limit: PageSize;
	total: number;
	pages: number;
};

export function paginationState(
	page: number,
	limit: PageSize = 20,
	total: number
): PaginationState {
	const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
	const pages = Math.max(1, Math.ceil(safeTotal / limit));
	const safePage = Number.isFinite(page) ? Math.max(1, Math.min(Math.floor(page), pages)) : 1;
	return { page: safePage, limit, total: safeTotal, pages };
}
