import { describe, expect, it } from 'vitest';
import type { DataAction } from './data-table';

type Row = { active: boolean };

describe('DataAction semantic intent', () => {
	it('accepts state-aware colors without inferring translated labels', () => {
		const action: DataAction<Row> = {
			key: 'toggle',
			label: (row) => row.active ? 'Désactiver' : 'Activer',
			variant: (row) => row.active ? 'warning' : 'success',
			onClick: () => {}
		};
		expect(typeof action.variant === 'function' && action.variant({ active: true })).toBe('warning');
		expect(typeof action.variant === 'function' && action.variant({ active: false })).toBe('success');
	});
});
