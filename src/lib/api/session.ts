import { api, ApiError, type ApiRequestInit } from './client';

export type BoIdentity = { id: number; context: 'bo' };
type LoginTokens = {
	access_token: string;
	refresh_token: string;
	expires_at: string;
	refresh_expires_at: string;
	token_type: 'Bearer';
};

let session: LoginTokens | null = null;
let sessionGeneration = 0;
let pendingRefresh: {
	generation: number;
	tokens: LoginTokens;
	promise: Promise<LoginTokens | null>;
} | null = null;

async function accessTokens(): Promise<LoginTokens | null> {
	const current = session;
	const generation = sessionGeneration;
	if (!current) return null;
	if (Date.parse(current.expires_at) > Date.now() + 30_000) return current;
	if (Date.parse(current.refresh_expires_at) <= Date.now()) {
		if (generation === sessionGeneration && session === current) session = null;
		return null;
	}
	if (pendingRefresh?.generation === generation && pendingRefresh.tokens === current) {
		return pendingRefresh.promise;
	}
	const refresh = (async (): Promise<LoginTokens | null> => {
		try {
			const next = await api<LoginTokens>('/apibo/auth/refresh', {
				method: 'POST',
				public: true,
				body: JSON.stringify({ refresh_token: current.refresh_token })
			});
			if (generation !== sessionGeneration || session !== current) return null;
			if (
				!next ||
				next.token_type !== 'Bearer' ||
				!next.access_token ||
				!next.refresh_token ||
				!Number.isFinite(Date.parse(next.expires_at)) ||
				!Number.isFinite(Date.parse(next.refresh_expires_at)) ||
				Date.parse(next.expires_at) <= Date.now() ||
				Date.parse(next.refresh_expires_at) <= Date.now()
			) {
				session = null;
				return null;
			}
			session = next;
			return next;
		} catch {
			if (generation === sessionGeneration && session === current) session = null;
			return null;
		}
	})();
	pendingRefresh = { generation, tokens: current, promise: refresh };
	try {
		return await refresh;
	} finally {
		if (pendingRefresh?.promise === refresh) pendingRefresh = null;
	}
}

/**
 * Ephemeral BO session. No localStorage, sessionStorage or persistent JS cookies.
 * A full reload intentionally requires a new login until the server-side cookie
 * transport has been validated.
 */
export async function loginBo(email: string, password: string): Promise<BoIdentity> {
	const generation = ++sessionGeneration;
	pendingRefresh = null;
	session = null;
	const tokens = await api<LoginTokens>('/apibo/auth/login', {
		method: 'POST',
		public: true,
		body: JSON.stringify({ email, password })
	});
	if (
		!tokens ||
		tokens.token_type !== 'Bearer' ||
		!tokens.access_token ||
		!tokens.refresh_token ||
		!Number.isFinite(Date.parse(tokens.expires_at)) ||
		!Number.isFinite(Date.parse(tokens.refresh_expires_at)) ||
		Date.parse(tokens.expires_at) <= Date.now() ||
		Date.parse(tokens.refresh_expires_at) <= Date.now()
	) {
		throw new Error('Invalid authentication response');
	}
	if (generation !== sessionGeneration) throw new Error('Authentication request superseded');
	try {
		const identity = await api<BoIdentity>('/apibo/auth/me', {
			accessToken: tokens.access_token
		});
		if (!identity || identity.context !== 'bo' || !Number.isInteger(identity.id) || identity.id < 1) {
			throw new Error('Invalid BO identity');
		}
		if (generation !== sessionGeneration) throw new Error('Authentication request superseded');
		session = tokens;
		return identity;
	} catch (error) {
		if (generation === sessionGeneration) session = null;
		throw error;
	}
}

export async function currentBo(): Promise<BoIdentity | null> {
	const current = await accessTokens();
	const generation = sessionGeneration;
	if (!current) return null;
	try {
		const identity = await api<BoIdentity>('/apibo/auth/me', {
			accessToken: current.access_token
		});
		if (generation !== sessionGeneration || session !== current) return null;
		if (identity.context !== 'bo' || !Number.isInteger(identity.id) || identity.id < 1) {
			session = null;
			return null;
		}
		return identity;
	} catch {
		if (generation === sessionGeneration && session === current) session = null;
		return null;
	}
}

export async function logoutBo(): Promise<void> {
	++sessionGeneration;
	pendingRefresh = null;
	const previous = session;
	session = null;
	if (!previous) return;
	try {
		await api<void>('/apibo/auth/logout', {
			method: 'POST',
			accessToken: previous.access_token,
			body: JSON.stringify({ refresh_token: previous.refresh_token })
		});
	} catch {
		// Fail closed locally even when the network cannot revoke the server token.
	}
}

/**
 * Authenticated BO module requests. Never expose token handling to individual modules.
 * Refresh is shared with currentBo(); a failed authorization invalidates this session.
 */
export async function boApi<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
	if (
		!path.startsWith('/apibo/') ||
		init.public ||
		init.accessToken ||
		init.credentials ||
		new Headers(init.headers).has('Authorization')
	) {
		throw new Error('boApi requires an authenticated BO path');
	}
	const tokens = await accessTokens();
	if (!tokens) throw new ApiError('Authentication required.', 401, 'unauthorized');
	const generation = sessionGeneration;
	try {
		const result = await api<T>(path, {
			...init,
			credentials: 'omit',
			accessToken: tokens.access_token
		});
		if (generation !== sessionGeneration || session !== tokens) {
			throw new ApiError('Session changed.', 401, 'unauthorized');
		}
		return result;
	} catch (error) {
		if (
			error instanceof ApiError &&
			error.status === 401 &&
			generation === sessionGeneration &&
			session === tokens
		) {
			session = null;
		}
		throw error;
	}
}
