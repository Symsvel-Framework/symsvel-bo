import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../app.css', import.meta.url), 'utf8');

describe('BO Design System cross-version CSS contract', () => {
	it('keeps light and dark semantic surface tokens', () => {
		expect(css).toMatch(/:root\s*\{[\s\S]*?--bo-surface:\s*#ffffff;/);
		expect(css).toMatch(/:root\[data-theme='dark'\]\s*\{[\s\S]*?--bo-surface:\s*#121c24;/);
	});
	it('overrides old scoped white module panels inside authenticated BO', () => {
		expect(css).toMatch(/:root \.bo-content \.panel\s*\{[\s\S]*?background-color:\s*var\(--bo-surface\);/);
		expect(css).toMatch(/:root \.bo-content \.panel \.module-group summary\s*\{[\s\S]*?background:\s*var\(--bo-surface-muted\);/);
		expect(css).toMatch(/:root \.bo-content \.panel :is\(input:not\(\[type='checkbox'\]\)[\s\S]*?background:\s*var\(--bo-input\);/);
	});
	it('never applies the old module panel bridge to public authentication screens', () => {
		expect(css).not.toMatch(/:root \.auth-shell \.panel\s*\{/);
	});
});
