import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./client')>();
	return { ...actual, api: vi.fn() };
});

import { api, ApiError } from './client';
import {
	boApi,
	completeBoSecondFactor,
	currentBo,
	loginBo,
	logoutBo,
	pendingBoSecondFactor,
	SecondFactorRequired
} from './session';

const mockedApi = vi.mocked(api);
const tokens = {
	access_token: 'a'.repeat(43),
	expires_at: '2099-01-01T00:00:00+00:00',
	token_type: 'Bearer'
} as const;
const identity = { id: 7, context: 'bo' };

const CHALLENGE_KEY = 'symsvel.bo.second-factor.challenge';

class MemoryStorage implements Storage {
	private readonly values = new Map<string, string>();

	get length(): number {
		return this.values.size;
	}
	clear(): void {
		this.values.clear();
	}
	getItem(key: string): string | null {
		return this.values.get(key) ?? null;
	}
	key(index: number): string | null {
		return [...this.values.keys()][index] ?? null;
	}
	removeItem(key: string): void {
		this.values.delete(key);
	}
	setItem(key: string, value: string): void {
		this.values.set(key, value);
	}
}

const challengeResponse = () => ({
	second_factor_required: true as const,
	challenge: 'b'.repeat(43),
	challenge_expires_at: new Date(Date.now() + 4 * 60_000).toISOString(),
	enrollment_required: true,
	totp_secret: 'JBSWY3DPEHPK3PXP',
	provisioning_uri: 'otpauth://totp/SymSvel%20BO?secret=JBSWY3DPEHPK3PXP'
});

describe('BO browser cookie and access session', () => {
	let browserStorage: MemoryStorage;

	beforeEach(async () => {
		vi.resetAllMocks();
		await logoutBo();
		vi.resetAllMocks();
		browserStorage = new MemoryStorage();
		vi.stubGlobal('window', { sessionStorage: browserStorage });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
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

	it('stores only the pre-session 2FA challenge and restores it after a module reload', async () => {
		const challenge = challengeResponse();
		mockedApi.mockResolvedValueOnce(challenge);
		await expect(loginBo('admin@example.test', 'password')).rejects.toBeInstanceOf(
			SecondFactorRequired
		);
		expect(pendingBoSecondFactor()).toEqual(challenge);
		expect(JSON.parse(browserStorage.getItem(CHALLENGE_KEY)!)).toEqual(challenge);
		expect(browserStorage.getItem(CHALLENGE_KEY)).not.toContain('refresh_token');

		// A real navigation can load a new JS module instance while retaining sessionStorage.
		vi.resetModules();
		const reloaded = await import('./session');
		expect(reloaded.pendingBoSecondFactor()).toEqual(challenge);
		const calls = mockedApi.mock.calls.filter(([path]) => path === '/apibo/auth/browser/refresh');
		expect(calls).toHaveLength(0);
	});

	it('clears a consumed 2FA challenge after the server issues tokens', async () => {
		const challenge = challengeResponse();
		mockedApi.mockResolvedValueOnce(challenge);
		await expect(loginBo('admin@example.test', 'password')).rejects.toBeInstanceOf(
			SecondFactorRequired
		);
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce(identity);
		expect(await completeBoSecondFactor('123456')).toEqual([]);
		expect(browserStorage.getItem(CHALLENGE_KEY)).toBeNull();
		expect(pendingBoSecondFactor()).toBeNull();
		expect(mockedApi).toHaveBeenCalledWith('/apibo/auth/browser/second-factor', {
			method: 'POST',
			credentials: 'include',
			body: JSON.stringify({ challenge: challenge.challenge, code: '123456' })
		});
	});

	it('rejects expired, corrupt or oversized persisted challenges and removes them', () => {
		for (const raw of [
			JSON.stringify({ ...challengeResponse(), challenge_expires_at: '2000-01-01T00:00:00Z' }),
			'{invalid-json',
			'x'.repeat(8193)
		]) {
			browserStorage.setItem(CHALLENGE_KEY, raw);
			expect(pendingBoSecondFactor()).toBeNull();
			expect(browserStorage.getItem(CHALLENGE_KEY)).toBeNull();
		}
	});

	it('clears an old challenge when a new login begins', async () => {
		mockedApi.mockResolvedValueOnce(challengeResponse());
		await expect(loginBo('admin@example.test', 'password')).rejects.toBeInstanceOf(
			SecondFactorRequired
		);
		expect(browserStorage.getItem(CHALLENGE_KEY)).not.toBeNull();
		mockedApi.mockRejectedValueOnce(new ApiError('Bad credentials', 401, 'invalid_credentials'));
		await expect(loginBo('admin@example.test', 'wrong')).rejects.toMatchObject({ status: 401 });
		expect(browserStorage.getItem(CHALLENGE_KEY)).toBeNull();
		expect(pendingBoSecondFactor()).toBeNull();
	});

	it('purges a pending challenge on logout', async () => {
		mockedApi.mockResolvedValueOnce(challengeResponse());
		await expect(loginBo('admin@example.test', 'password')).rejects.toBeInstanceOf(
			SecondFactorRequired
		);
		await logoutBo();
		expect(browserStorage.getItem(CHALLENGE_KEY)).toBeNull();
		expect(pendingBoSecondFactor()).toBeNull();
	});

	it('retains the memory challenge when sessionStorage is blocked', async () => {
		vi.stubGlobal('window', {
			get sessionStorage(): Storage {
				throw new Error('Storage denied');
			}
		});
		const challenge = challengeResponse();
		mockedApi.mockResolvedValueOnce(challenge);
		await expect(loginBo('admin@example.test', 'password')).rejects.toBeInstanceOf(
			SecondFactorRequired
		);
		expect(pendingBoSecondFactor()).toEqual(challenge);
	});
});
