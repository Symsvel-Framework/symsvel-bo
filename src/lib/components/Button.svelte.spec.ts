import { createRawSnippet } from 'svelte';
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Button from './Button.svelte';

const children = createRawSnippet(() => ({ render: () => 'Enregistrer' }));

describe('BO Button submission contract', () => {
	it('never submits an enclosing form implicitly', async () => {
		render(Button, { children });
		await expect
			.element(page.getByRole('button', { name: 'Enregistrer' }))
			.toHaveAttribute('type', 'button');
	});

	it('keeps explicit form submission available', async () => {
		render(Button, { children, type: 'submit' });
		await expect
			.element(page.getByRole('button', { name: 'Enregistrer' }))
			.toHaveAttribute('type', 'submit');
	});
});
