import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './client';

describe('BO API client security', () => {
	beforeEach(() => {
		vi.stubEnv('PUBLIC_API_URL', 'https://backend.example.test');
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it('strips credentials and Authorization from public requests', async () => {
		const mockedFetch = vi.mocked(fetch);
		mockedFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		await api('/apibo/auth/login', {
			method: 'POST',
			public: true,
			credentials: 'include',
			headers: {
				Authorization: 'Bearer leaked',
				Cookie: 'session=leaked',
				'Proxy-Authorization': 'Basic leaked'
			},
			body: JSON.stringify({ email: 'admin@example.test', password: 'secret' })
		});
		const [url, init] = mockedFetch.mock.calls[0];
		expect(String(url)).toContain('/apibo/auth/login?');
		expect(init?.credentials).toBe('omit');
		expect(new Headers(init?.headers).has('Authorization')).toBe(false);
		expect(new Headers(init?.headers).has('Cookie')).toBe(false);
		expect(new Headers(init?.headers).has('Proxy-Authorization')).toBe(false);
	});

	it('sends a supplied access token only on authenticated requests', async () => {
		const mockedFetch = vi.mocked(fetch);
		mockedFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
		await api('/apibo/auth/me', { accessToken: 'example-token' });
		const [, init] = mockedFetch.mock.calls[0];
		expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer example-token');
	});

	it('rejects protocol-relative URLs without fetching', async () => {
		await expect(api('//other.example.test/path')).rejects.toThrow('root-relative');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('rejects backslash and newline path escapes', async () => {
		await expect(api('/\\\\other.example.test')).rejects.toThrow('root-relative');
		await expect(api('/apibo/auth/me' + String.fromCharCode(10) + 'Injected: yes')).rejects.toThrow(
			'root-relative'
		);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('does not treat an unsuccessful empty response as success', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 }));
		await expect(api('/apibo/auth/me')).rejects.toMatchObject({
			status: 401,
			message: 'API request failed.'
		});
	});

	it('uses a safe fallback for malformed backend error payloads', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			new Response(JSON.stringify({ error: { message: 42, code: 17 } }), { status: 500 })
		);
		await expect(api('/apibo/auth/me')).rejects.toMatchObject({
			status: 500,
			message: 'API request failed.',
			code: undefined
		});
	});

	it('preserves the backend error code and status', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			new Response(
				JSON.stringify({ error: { code: 'invalid_session', message: 'Session expired.' } }),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			)
		);
		await expect(api('/apibo/auth/me')).rejects.toMatchObject({
			name: 'ApiError',
			status: 401,
			code: 'invalid_session'
		} satisfies Partial<ApiError>);
	});
});
