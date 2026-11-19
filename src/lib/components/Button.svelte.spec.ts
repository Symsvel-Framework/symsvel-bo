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

describe('Semantic BO button variants', () => {
	it('keeps success, danger, warning, active and inactive intents explicit', async () => {
		for (const variant of ['success', 'danger', 'warning', 'active', 'inactive'] as const) {
			const { unmount } = render(Button, { children, variant });
			await expect.element(page.getByRole('button', { name: 'Enregistrer' }))
				.toHaveClass('bo-button-' + variant);
			unmount();
		}
	});

	it('keeps the disabled property and loading lock', async () => {
		const { unmount } = render(Button, { children, variant: 'danger', disabled: true });
		await expect.element(page.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
		unmount();
		render(Button, { children, loading: true, variant: 'success' });
		await expect.element(page.getByRole('button')).toBeDisabled();
	});
});
