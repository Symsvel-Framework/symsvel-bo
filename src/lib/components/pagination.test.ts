import { describe, expect, it } from 'vitest';
import { PAGE_SIZES, paginationState } from './pagination';

describe('pagination contract', () => {
	it('exposes exactly the supported page sizes', () => {
		expect(PAGE_SIZES).toEqual([10, 20, 50, 100]);
	});

	it('uses 20 rows by default and calculates pages', () => {
		expect(paginationState(1, undefined, 249)).toEqual({
			page: 1,
			limit: 20,
			total: 249,
			pages: 13
		});
	});

	it('clamps page bounds and handles empty results', () => {
		expect(paginationState(99, 10, 21).page).toBe(3);
		expect(paginationState(0, 50, 0)).toEqual({
			page: 1,
			limit: 50,
			total: 0,
			pages: 1
		});
	});
});
