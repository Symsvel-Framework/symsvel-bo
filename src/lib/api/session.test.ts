import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./client')>();
	return { ...actual, api: vi.fn() };
});

import { api, ApiError } from './client';
import { boApi, currentBo, loginBo, logoutBo } from './session';

const mockedApi = vi.mocked(api);
const tokens = {
	access_token: 'a'.repeat(43),
	expires_at: '2099-01-01T00:00:00+00:00',
	token_type: 'Bearer'
} as const;
const identity = { id: 7, context: 'bo' };

describe('BO browser cookie and access session', () => {
	beforeEach(async () => {
		vi.resetAllMocks();
		await logoutBo();
		vi.resetAllMocks();
	});

	it('logs in without returning a JS refresh token and logs out through the cookie', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce(identity);
		expect(await loginBo('admin@example.test', 'password')).toEqual(identity);
		expect(mockedApi).toHaveBeenNthCalledWith(1, '/apibo/auth/browser/login', {
			method: 'POST',
			credentials: 'include',
			body: JSON.stringify({ email: 'admin@example.test', password: 'password' })
		});
		expect(mockedApi).toHaveBeenNthCalledWith(2, '/apibo/auth/me', {
			accessToken: tokens.access_token
		});
		mockedApi.mockResolvedValueOnce(identity);
		expect(await currentBo()).toEqual(identity);
		mockedApi.mockResolvedValueOnce(undefined);
		await logoutBo();
		expect(mockedApi).toHaveBeenLastCalledWith('/apibo/auth/browser/logout', {
			method: 'POST',
			credentials: 'include'
		});
	});

	it('restores a session with cookie-based refresh when memory starts empty', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce(identity);
		expect(await currentBo()).toEqual(identity);
		expect(mockedApi).toHaveBeenNthCalledWith(1, '/apibo/auth/browser/refresh', {
			method: 'POST',
			credentials: 'include'
		});
		expect(mockedApi).toHaveBeenNthCalledWith(2, '/apibo/auth/me', {
			accessToken: tokens.access_token
		});
	});

	it('shares one browser refresh across simultaneous calls', async () => {
		const deferred = Promise.withResolvers<typeof tokens>();
		mockedApi.mockResolvedValueOnce(deferred.promise);
		const first = currentBo();
		const second = currentBo();
		deferred.resolve(tokens);
		mockedApi.mockResolvedValue(identity);
		expect(await Promise.all([first, second])).toEqual([identity, identity]);
		expect(
			mockedApi.mock.calls.filter(([path]) => path === '/apibo/auth/browser/refresh')
		).toHaveLength(1);
	});

	it('renews an access token before expiration without exposing its refresh secret', async () => {
		const expiring = { ...tokens, expires_at: new Date(Date.now() + 1_000).toISOString() };
		const renewed = { ...tokens, access_token: 'c'.repeat(43) };
		mockedApi.mockResolvedValueOnce(expiring).mockResolvedValueOnce(identity);
		await loginBo('admin@example.test', 'password');
		mockedApi.mockResolvedValueOnce(renewed).mockResolvedValueOnce(identity);
		expect(await currentBo()).toEqual(identity);
		expect(mockedApi).toHaveBeenCalledWith('/apibo/auth/browser/refresh', {
			method: 'POST',
			credentials: 'include'
		});
		expect(mockedApi).toHaveBeenLastCalledWith('/apibo/auth/me', {
			accessToken: renewed.access_token
		});
	});

	it('rejects any leaked refresh token in JSON', async () => {
		mockedApi.mockResolvedValueOnce({ ...tokens, refresh_token: 'secret' });
		await expect(loginBo('admin@example.test', 'password')).rejects.toThrow(
			'Invalid authentication response'
		);
	});

	it('rejects expired or malformed access tokens', async () => {
		mockedApi.mockResolvedValueOnce({ ...tokens, expires_at: '2000-01-01T00:00:00+00:00' });
		await expect(loginBo('admin@example.test', 'password')).rejects.toThrow(
			'Invalid authentication response'
		);
		mockedApi.mockResolvedValueOnce(null);
		expect(await currentBo()).toBeNull();
	});

	it('never restores a login response arriving after logout', async () => {
		const deferred = Promise.withResolvers<typeof tokens>();
		mockedApi.mockResolvedValueOnce(deferred.promise);
		const login = loginBo('admin@example.test', 'password');
		const rejected = expect(login).rejects.toThrow('superseded');
		const logout = logoutBo();
		deferred.resolve(tokens);
		await rejected;
		await logout;
		expect(await currentBo()).toBeNull();
	});

	it('does not restore a refresh that arrives during logout', async () => {
		const deferred = Promise.withResolvers<typeof tokens>();
		mockedApi.mockResolvedValueOnce(deferred.promise);
		const current = currentBo();
		const logout = logoutBo();
		deferred.resolve(tokens);
		expect(await current).toBeNull();
		await logout;
		expect(mockedApi).toHaveBeenCalledWith('/apibo/auth/browser/logout', {
			method: 'POST',
			credentials: 'include'
		});
	});

	it('ignores invalid cookies and does not retry refresh indefinitely', async () => {
		mockedApi.mockRejectedValueOnce(new ApiError('Invalid', 401, 'invalid_session'));
		expect(await currentBo()).toBeNull();
		expect(
			mockedApi.mock.calls.filter(([path]) => path === '/apibo/auth/browser/refresh')
		).toHaveLength(1);
	});

	it('sends only a short-lived Bearer on module requests', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce(identity);
		await loginBo('admin@example.test', 'password');
		mockedApi.mockResolvedValueOnce({ data: [1, 2] });
		expect(await boApi('/apibo/admins')).toEqual({ data: [1, 2] });
		expect(mockedApi).toHaveBeenLastCalledWith('/apibo/admins', {
			credentials: 'omit',
			accessToken: tokens.access_token
		});
	});

	it('does not allow modules to attach cookies or inject credentials', async () => {
		await expect(boApi('/apibo/users', { credentials: 'include' })).rejects.toThrow(
			'authenticated BO path'
		);
		await expect(boApi('/api/users')).rejects.toThrow('authenticated BO path');
		await expect(boApi('/apibo/users', { public: true })).rejects.toThrow('authenticated BO path');
		await expect(boApi('/apibo/users', { accessToken: 'injected' })).rejects.toThrow(
			'authenticated BO path'
		);
	});

	it('invalidates access on a module 401', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce(identity);
		await loginBo('admin@example.test', 'password');
		mockedApi.mockRejectedValueOnce(new ApiError('Unauthorized', 401, 'unauthorized'));
		await expect(boApi('/apibo/admins')).rejects.toMatchObject({ status: 401 });
	});

	it('rejects a mismatched principal and revokes the cookie', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce({ id: 7, context: 'app' });
		mockedApi.mockResolvedValueOnce(undefined);
		await expect(loginBo('admin@example.test', 'password')).rejects.toThrow('Invalid BO identity');
		expect(mockedApi).toHaveBeenLastCalledWith('/apibo/auth/browser/logout', {
			method: 'POST',
			credentials: 'include'
		});
	});
});
