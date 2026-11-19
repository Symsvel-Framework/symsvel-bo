import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../components/AppShell.svelte', import.meta.url), 'utf8');
describe('BO conditional navigation refresh', () => {
	it('re-probes installed modules without remounting or navigating', () => {
		expect(source).toContain("addEventListener('symsvel:navigation-changed', refreshNavigation)");
		expect(source).toContain(
			"removeEventListener('symsvel:navigation-changed', refreshNavigation)"
		);
		expect(source).toContain('revision !== navigationRevision');
		expect(source).toContain('availableBoNavigation(declaredBoNavigation()');
	});
});
