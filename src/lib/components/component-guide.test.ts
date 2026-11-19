import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const guide = readFileSync(new URL('../../../docs/dev/bo-components.md', import.meta.url), 'utf8');
const buttonSource = readFileSync(new URL('./Button.svelte', import.meta.url), 'utf8');
const tableSource = readFileSync(new URL('./data-table.ts', import.meta.url), 'utf8');

describe('BO developer guide matches public component contracts', () => {
	it('documents each public primitive and keeps AppShell internal', () => {
		for (const name of ['Button', 'Alert', 'InputField', 'Dropdown', 'Modal', 'DataTable', 'Pagination']) {
			expect(guide).toContain('### ' + name);
		}
		expect(guide).toContain('AppShell');
		expect(guide).toContain('interne au BO hôte');
	});
	it('documents every semantic button variant and the default button type', () => {
		const variants = ['primary', 'secondary', 'success', 'danger', 'warning', 'active', 'inactive'];
		const variantTypes = readFileSync(new URL('./button.ts', import.meta.url), 'utf8');
		for (const variant of variants) {
			expect(variantTypes).toContain("'"+variant+"'");
			expect(guide).toContain('`' + variant + '`');
		}
		expect(buttonSource).toContain("type = 'button'");
		expect(guide).toContain('`type="submit"`');
	});
	it('explains controlled DataTable sorting and state-aware action variants', () => {
		expect(tableSource).toContain('variant?: BoButtonVariant | ((row: T) => BoButtonVariant)');
		expect(guide).toContain('onSortChange');
		expect(guide).toContain('avant');
		expect(guide).toContain("variant: (row) => row.enabled ? 'warning' : 'success'");
	});
});
