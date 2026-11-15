import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({ api: vi.fn() }));

import { api } from './client';
import { currentBo, loginBo, logoutBo } from './session';

const mockedApi = vi.mocked(api);
const tokens = {
	access_token: 'a'.repeat(43),
	refresh_token: 'b'.repeat(43),
	expires_at: '2099-01-01T00:00:00+00:00',
	refresh_expires_at: '2099-02-01T00:00:00+00:00',
	token_type: 'Bearer'
};

describe('ephemeral BO session', () => {
	beforeEach(async () => {
		vi.resetAllMocks();
		await logoutBo();
		vi.resetAllMocks();
	});

	it('verifies login, checks identity and revokes on logout', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce({ id: 7, context: 'bo' });
		expect(await loginBo('admin@example.test', 'password')).toEqual({ id: 7, context: 'bo' });
		mockedApi.mockResolvedValueOnce({ id: 7, context: 'bo' });
		expect(await currentBo()).toEqual({ id: 7, context: 'bo' });
		mockedApi.mockResolvedValueOnce(undefined);
		await logoutBo();
		expect(mockedApi).toHaveBeenLastCalledWith('/apibo/auth/logout', {
			method: 'POST',
			accessToken: tokens.access_token,
			body: JSON.stringify({ refresh_token: tokens.refresh_token })
		});
		expect(await currentBo()).toBeNull();
	});

	it('never restores a login response arriving after logout', async () => {
		const deferred = Promise.withResolvers<typeof tokens>();
		mockedApi.mockResolvedValueOnce(deferred.promise);
		const pending = loginBo('admin@example.test', 'password');
		await logoutBo();
		deferred.resolve(tokens);
		await expect(pending).rejects.toThrow('superseded');
		expect(await currentBo()).toBeNull();
	});

	it('rotates expiring tokens before checking BO identity', async () => {
		const expiring = { ...tokens, expires_at: new Date(Date.now() + 1_000).toISOString() };
		const renewed = { ...tokens, access_token: 'c'.repeat(43), refresh_token: 'd'.repeat(43) };
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce({ id: 7, context: 'bo' });
		await loginBo('admin@example.test', 'password');
		mockedApi.mockResolvedValueOnce(renewed).mockResolvedValueOnce({ id: 7, context: 'bo' });
		expect(await currentBo()).toEqual({ id: 7, context: 'bo' });
		expect(mockedApi).toHaveBeenCalledWith('/apibo/auth/refresh', {
			method: 'POST',
			public: true,
			body: JSON.stringify({ refresh_token: expiring.refresh_token })
		});
		expect(mockedApi).toHaveBeenLastCalledWith('/apibo/auth/me', {
			accessToken: renewed.access_token
		});
	});

	it('shares one refresh across concurrent BO checks', async () => {
		const expiring = { ...tokens, expires_at: new Date(Date.now() + 1_000).toISOString() };
		const renewed = { ...tokens, access_token: 'c'.repeat(43), refresh_token: 'd'.repeat(43) };
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce({ id: 7, context: 'bo' });
		await loginBo('admin@example.test', 'password');
		const deferred = Promise.withResolvers<typeof tokens>();
		mockedApi.mockResolvedValueOnce(deferred.promise);
		const first = currentBo();
		const second = currentBo();
		deferred.resolve(renewed);
		mockedApi.mockResolvedValue({ id: 7, context: 'bo' });
		expect(await Promise.all([first, second])).toEqual([
			{ id: 7, context: 'bo' },
			{ id: 7, context: 'bo' }
		]);
		expect(mockedApi.mock.calls.filter(([path]) => path === '/apibo/auth/refresh')).toHaveLength(1);
	});

	it('never restores a refresh response arriving after logout', async () => {
		const expiring = { ...tokens, expires_at: new Date(Date.now() + 1_000).toISOString() };
		const renewed = { ...tokens, access_token: 'c'.repeat(43), refresh_token: 'd'.repeat(43) };
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce({ id: 7, context: 'bo' });
		await loginBo('admin@example.test', 'password');
		const deferred = Promise.withResolvers<typeof tokens>();
		mockedApi.mockResolvedValueOnce(deferred.promise);
		const pending = currentBo();
		mockedApi.mockResolvedValueOnce(undefined);
		await logoutBo();
		deferred.resolve(renewed);
		expect(await pending).toBeNull();
		expect(await currentBo()).toBeNull();
	});

	it('rejects an already expired login token', async () => {
		mockedApi.mockResolvedValueOnce({
			...tokens,
			expires_at: '2000-01-01T00:00:00+00:00'
		});
		await expect(loginBo('admin@example.test', 'password')).rejects.toThrow(
			'Invalid authentication response'
		);
		expect(await currentBo()).toBeNull();
	});

	it('closes the session when refresh fails', async () => {
		const expiring = { ...tokens, expires_at: new Date(Date.now() + 1_000).toISOString() };
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce({ id: 7, context: 'bo' });
		await loginBo('admin@example.test', 'password');
		mockedApi.mockRejectedValueOnce(new Error('invalid_session'));
		expect(await currentBo()).toBeNull();
		expect(await currentBo()).toBeNull();
		expect(mockedApi.mock.calls.filter(([path]) => path === '/apibo/auth/refresh')).toHaveLength(1);
	});

	it('rejects an expired refresh token at login', async () => {
		mockedApi.mockResolvedValueOnce({
			...tokens,
			refresh_expires_at: '2000-01-01T00:00:00+00:00'
		});
		await expect(loginBo('admin@example.test', 'password')).rejects.toThrow(
			'Invalid authentication response'
		);
		expect(mockedApi).toHaveBeenCalledTimes(1);
	});

	it('rejects a refresh response with an expired access token', async () => {
		const expiring = { ...tokens, expires_at: new Date(Date.now() + 1_000).toISOString() };
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce({ id: 7, context: 'bo' });
		await loginBo('admin@example.test', 'password');
		mockedApi.mockResolvedValueOnce({ ...tokens, expires_at: '2000-01-01T00:00:00+00:00' });
		expect(await currentBo()).toBeNull();
		expect(await currentBo()).toBeNull();
	});

	it('does not request a refresh when its expiration has passed', async () => {
		const expiring = {
			...tokens,
			expires_at: new Date(Date.now() + 1_000).toISOString(),
			refresh_expires_at: new Date(Date.now() + 2_000).toISOString()
		};
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce({ id: 7, context: 'bo' });
		await loginBo('admin@example.test', 'password');
		vi.useFakeTimers();
		try {
			vi.setSystemTime(Date.now() + 3_000);
			expect(await currentBo()).toBeNull();
			expect(mockedApi.mock.calls.filter(([path]) => path === '/apibo/auth/refresh')).toHaveLength(
				0
			);
		} finally {
			vi.useRealTimers();
		}
	});

	it('rejects a mismatched BO identity', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce({ id: 7, context: 'app' });
		await expect(loginBo('admin@example.test', 'password')).rejects.toThrow('Invalid BO identity');
		expect(await currentBo()).toBeNull();
	});
});
