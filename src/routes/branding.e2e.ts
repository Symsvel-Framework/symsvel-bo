import { expect, test } from '@playwright/test';

test('public project branding is loaded from Back', async ({ page }) => {
	await page.route('**/apiopen/project', async (route) => {
		expect(route.request().headers()['authorization']).toBeUndefined();
		await route.fulfill({ json: { data: { name: 'Choralys Démo' } } });
	});
	await page.goto('/login');
	await expect(page).toHaveTitle(/Choralys Démo/);
	await expect(page.locator('header strong')).toHaveText('Choralys Démo');
});

test('unavailable public project branding falls back safely', async ({ page }) => {
	await page.route('**/apiopen/project', (route) => route.fulfill({ status: 503 }));
	await page.goto('/login');
	await expect(page).toHaveTitle(/SymSvel/);
});
