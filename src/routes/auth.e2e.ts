import { expect, test } from '@playwright/test';

const tokens = {
	access_token: 'a'.repeat(43),
	refresh_token: 'b'.repeat(43),
	expires_at: '2099-01-01T00:00:00+00:00',
	refresh_expires_at: '2099-02-01T00:00:00+00:00',
	token_type: 'Bearer'
};

test('BO login, authenticated dashboard and logout', async ({ page }) => {
	let loginCalls = 0;
	let meCalls = 0;
	let logoutCalls = 0;
	await page.route('**/apibo/auth/login?*', async (route) => {
		loginCalls++;
		expect(route.request().method()).toBe('POST');
		expect(route.request().headers().authorization).toBeUndefined();
		expect(route.request().postDataJSON()).toEqual({
			email: 'admin@example.test',
			password: 'password'
		});
		await route.fulfill({ status: 200, json: tokens });
	});
	await page.route('**/apibo/auth/me?*', async (route) => {
		meCalls++;
		expect(route.request().headers().authorization).toBe('Bearer ' + tokens.access_token);
		await route.fulfill({ status: 200, json: { id: 7, context: 'bo' } });
	});
	await page.route('**/apibo/auth/logout?*', async (route) => {
		logoutCalls++;
		expect(route.request().headers().authorization).toBe('Bearer ' + tokens.access_token);
		await route.fulfill({ status: 204, body: '' });
	});
	await page.goto('/login');
	await page.getByLabel('Adresse e-mail').fill('admin@example.test');
	await page.getByLabel('Mot de passe').fill('password');
	await page.getByRole('button', { name: 'Se connecter' }).click();
	await expect(page).toHaveURL(/\/dashboard$/);
	await expect(page.getByText('Administrateur #7')).toBeVisible();
	expect(loginCalls).toBe(1);
	expect(meCalls).toBeGreaterThanOrEqual(2);
	await page.getByRole('button', { name: 'Déconnexion' }).click();
	await expect(page).toHaveURL(/\/login$/);
	expect(logoutCalls).toBe(1);
});

test('invalid credentials keep the BO on the login page', async ({ page }) => {
	await page.route('**/apibo/auth/login?*', async (route) => {
		await route.fulfill({
			status: 401,
			json: { error: { code: 'invalid_credentials', message: 'Invalid credentials.' } }
		});
	});
	await page.goto('/login');
	await page.getByLabel('Adresse e-mail').fill('admin@example.test');
	await page.getByLabel('Mot de passe').fill('wrong');
	await page.getByRole('button', { name: 'Se connecter' }).click();
	await expect(page.getByRole('alert')).toHaveText('Identifiants incorrects.');
	await expect(page).toHaveURL(/\/login$/);
});

test('direct dashboard access without a session redirects to login', async ({ page }) => {
	await page.goto('/dashboard');
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
});

test('wrong BO context refuses login and does not open the dashboard', async ({ page }) => {
	await page.route('**/apibo/auth/login?*', (route) =>
		route.fulfill({ status: 200, json: tokens })
	);
	await page.route('**/apibo/auth/me?*', (route) =>
		route.fulfill({ status: 200, json: { id: 7, context: 'app' } })
	);
	await page.goto('/login');
	await page.getByLabel('Adresse e-mail').fill('admin@example.test');
	await page.getByLabel('Mot de passe').fill('password');
	await page.getByRole('button', { name: 'Se connecter' }).click();
	await expect(page.getByRole('alert')).toHaveText('Connexion impossible pour le moment.');
	await expect(page).toHaveURL(/\/login$/);
});

test('a browser reload discards the temporary BO session', async ({ page }) => {
	await page.route('**/apibo/auth/login?*', (route) =>
		route.fulfill({ status: 200, json: tokens })
	);
	await page.route('**/apibo/auth/me?*', (route) =>
		route.fulfill({ status: 200, json: { id: 7, context: 'bo' } })
	);
	await page.goto('/login');
	await page.getByLabel('Adresse e-mail').fill('admin@example.test');
	await page.getByLabel('Mot de passe').fill('password');
	await page.getByRole('button', { name: 'Se connecter' }).click();
	await expect(page.getByText('Administrateur #7')).toBeVisible();
	await page.reload();
	await expect(page).toHaveURL(/\/login$/);
});

test('revoked BO session redirects the dashboard to login', async ({ page }) => {
	let identityCalls = 0;
	await page.route('**/apibo/auth/login?*', (route) =>
		route.fulfill({ status: 200, json: tokens })
	);
	await page.route('**/apibo/auth/me?*', (route) => {
		identityCalls++;
		if (identityCalls === 1) {
			return route.fulfill({ status: 200, json: { id: 7, context: 'bo' } });
		}
		return route.fulfill({
			status: 401,
			json: { error: { code: 'unauthorized', message: 'Authentication required.' } }
		});
	});
	await page.goto('/login');
	await page.getByLabel('Adresse e-mail').fill('admin@example.test');
	await page.getByLabel('Mot de passe').fill('password');
	await page.getByRole('button', { name: 'Se connecter' }).click();
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
	expect(identityCalls).toBeGreaterThanOrEqual(2);
});

test('login requests include interface and translation languages', async ({ page }) => {
	await page.route('**/apibo/auth/login?*', async (route) => {
		const url = new URL(route.request().url());
		expect(url.searchParams.get('ui_lang')).toMatch(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/);
		expect(url.searchParams.get('translation_lang')).toBe(url.searchParams.get('ui_lang'));
		await route.fulfill({
			status: 401,
			json: { error: { code: 'invalid_credentials', message: 'Invalid credentials.' } }
		});
	});
	await page.goto('/login');
	await page.getByLabel('Adresse e-mail').fill('admin@example.test');
	await page.getByLabel('Mot de passe').fill('wrong');
	await page.getByRole('button', { name: 'Se connecter' }).click();
	await expect(page.getByRole('alert')).toHaveText('Identifiants incorrects.');
});
