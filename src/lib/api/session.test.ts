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

	it('rejects a mismatched BO identity', async () => {
		mockedApi.mockResolvedValueOnce(tokens).mockResolvedValueOnce({ id: 7, context: 'app' });
		await expect(loginBo('admin@example.test', 'password')).rejects.toThrow(
			'Invalid BO identity'
		);
		expect(await currentBo()).toBeNull();
	});
});
