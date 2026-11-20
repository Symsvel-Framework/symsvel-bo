import { describe, expect, it } from 'vitest';
import { displayCell, nextSort } from './data-table';

describe('DataTable helpers', () => {
	it('sorts ascending by default and toggles the same column', () => {
		expect(nextSort('name', null, 'desc')).toEqual({ key: 'name', order: 'asc' });
		expect(nextSort('name', 'name', 'asc')).toEqual({ key: 'name', order: 'desc' });
		expect(nextSort('email', 'name', 'desc')).toEqual({ key: 'email', order: 'asc' });
	});

	it('renders simple values without exposing objects', () => {
		const row = { id: 1, active: true, title: null, nested: { a: 1 } };
		expect(displayCell({ key: 'active', label: 'Actif' }, row)).toBe('Oui');
		expect(displayCell({ key: 'title', label: 'Titre' }, row)).toBe('');
		expect(displayCell({ key: 'nested', label: 'Objet' }, row)).toBe('');
		expect(displayCell({ key: 'id', label: 'ID', format: (v) => `#${v}` }, row)).toBe('#1');
	});
	it('uses English boolean labels when supplied by the host', () => {
		expect(
			displayCell({ key: 'active', label: 'Active' }, { active: false }, { yes: 'Yes', no: 'No' })
		).toBe('No');
	});
});
