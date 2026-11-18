import { api, ApiError, type ApiRequestInit } from './client';

export type BoIdentity = { id: number; context: 'bo' };
/** Access tokens only. The refresh secret never enters JavaScript. */
type BrowserAccess = {
	access_token: string;
	expires_at: string;
	token_type: 'Bearer';
};

export type SecondFactorChallenge = {
	second_factor_required: true;
	challenge: string;
	challenge_expires_at: string;
	enrollment_required: boolean;
	totp_secret?: string;
	provisioning_uri?: string;
};
export class SecondFactorRequired extends Error {
	constructor() {
		super('Additional authentication required');
		this.name = 'SecondFactorRequired';
	}
}
// This is a pre-authentication challenge, not an authenticated session.
const BO_CHALLENGE_KEY = 'symsvel.bo.second-factor.challenge';
const MAX_STORED_CHALLENGE_LENGTH = 8192;
let pendingSecondFactor: SecondFactorChallenge | null = null;

function challengeStorage(): Storage | null {
	try {
		return typeof window === 'undefined' ? null : window.sessionStorage;
	} catch {
		// Private browsing and hardened environments can reject storage access.
		return null;
	}
}

function clearPendingBoSecondFactor(): void {
	pendingSecondFactor = null;
	try {
		challengeStorage()?.removeItem(BO_CHALLENGE_KEY);
	} catch {
		// Keep in-memory cleanup effective if storage is unavailable.
	}
}

function savePendingBoSecondFactor(challenge: SecondFactorChallenge): void {
	pendingSecondFactor = challenge;
	try {
		challengeStorage()?.setItem(BO_CHALLENGE_KEY, JSON.stringify(challenge));
	} catch {
		// Navigation in the same JS runtime can still use the memory copy.
	}
}

/** Restore the short-lived challenge after a full page navigation in this tab. */
export function pendingBoSecondFactor(): SecondFactorChallenge | null {
	if (pendingSecondFactor !== null) {
		if (validSecondFactor(pendingSecondFactor)) return pendingSecondFactor;
		clearPendingBoSecondFactor();
		return null;
	}
	let raw: string | null;
	try {
		raw = challengeStorage()?.getItem(BO_CHALLENGE_KEY) ?? null;
	} catch {
		return null;
	}
	if (raw === null) return null;
	if (raw.length <= MAX_STORED_CHALLENGE_LENGTH) {
		try {
			const candidate: unknown = JSON.parse(raw);
			if (validSecondFactor(candidate)) {
				pendingSecondFactor = candidate;
				return candidate;
			}
		} catch {
			// Discard corrupt or tampered storage values.
		}
	}
	clearPendingBoSecondFactor();
	return null;
}
function validSecondFactor(value: unknown): value is SecondFactorChallenge {
	if (!value || typeof value !== 'object') return false;
	const data = value as Partial<SecondFactorChallenge>;
	return (
		data.second_factor_required === true &&
		typeof data.challenge === 'string' &&
		/^[A-Za-z0-9_-]{43}$/.test(data.challenge) &&
		typeof data.challenge_expires_at === 'string' &&
		Number.isFinite(Date.parse(data.challenge_expires_at)) &&
		Date.parse(data.challenge_expires_at) > Date.now() &&
		typeof data.enrollment_required === 'boolean'
	);
}

let session: BrowserAccess | null = null;
let sessionGeneration = 0;
let pendingRefresh: { generation: number; promise: Promise<BrowserAccess | null> } | null = null;
let pendingLogin: Promise<BoIdentity> | null = null;

function validAccess(value: BrowserAccess | null): value is BrowserAccess {
	if (!value || typeof value !== 'object') return false;
	if (
		value.token_type !== 'Bearer' ||
		typeof value.access_token !== 'string' ||
		!/^[A-Za-z0-9_-]{43}$/.test(value.access_token) ||
		typeof value.expires_at !== 'string' ||
		!Number.isFinite(Date.parse(value.expires_at)) ||
		Date.parse(value.expires_at) <= Date.now()
	)
		return false;
	// An accidentally exposed refresh token is a broken server contract.
	return !('refresh_token' in value);
}

async function renew(): Promise<BrowserAccess | null> {
	const generation = sessionGeneration;
	if (pendingRefresh?.generation === generation) return pendingRefresh.promise;

	const promise = (async (): Promise<BrowserAccess | null> => {
		try {
			const access = await api<BrowserAccess>('/apibo/auth/browser/refresh', {
				method: 'POST',
				credentials: 'include'
			});
			if (generation !== sessionGeneration) return null;
			if (!validAccess(access)) {
				session = null;
				return null;
			}
			session = access;
			return access;
		} catch {
			if (generation === sessionGeneration) session = null;
			return null;
		}
	})();

	pendingRefresh = { generation, promise };
	try {
		return await promise;
	} finally {
		if (pendingRefresh?.promise === promise) pendingRefresh = null;
	}
}

async function accessTokens(): Promise<BrowserAccess | null> {
	const current = session;
	if (current && Date.parse(current.expires_at) > Date.now() + 30_000) return current;
	// Restores the BO after a full reload, or rotates a short-lived access token.
	// The HttpOnly cookie is sent by the browser, never read by JavaScript.
	return renew();
}

function validIdentity(identity: BoIdentity | null): identity is BoIdentity {
	return (
		!!identity && identity.context === 'bo' && Number.isInteger(identity.id) && identity.id > 0
	);
}

/**
 * BO password login. The server sets the Secure HttpOnly refresh cookie.
 * No refresh token is returned to, or persisted by, the Svelte runtime.
 */
export async function loginBo(email: string, password: string): Promise<BoIdentity> {
	const generation = ++sessionGeneration;
	const previousRefresh = pendingRefresh?.promise;
	const previousLogin = pendingLogin;
	session = null;
	clearPendingBoSecondFactor();
	pendingRefresh = null;
	const operation = (async (): Promise<BoIdentity> => {
		// Avoid an old in-flight response overwriting a newer session cookie.
		if (previousRefresh) await previousRefresh.catch(() => null);
		if (previousLogin) await previousLogin.catch(() => null);
		if (generation !== sessionGeneration) throw new Error('Authentication request superseded');
		const access = await api<BrowserAccess | SecondFactorChallenge>('/apibo/auth/browser/login', {
			method: 'POST',
			credentials: 'include',
			body: JSON.stringify({ email, password })
		});
		if (generation !== sessionGeneration) throw new Error('Authentication request superseded');
		if (validSecondFactor(access)) {
			savePendingBoSecondFactor(access);
			throw new SecondFactorRequired();
		}
		if (!validAccess(access)) {
			throw new Error('Invalid authentication response');
		}
		try {
			const identity = await api<BoIdentity>('/apibo/auth/me', {
				accessToken: access.access_token
			});
			if (generation !== sessionGeneration) throw new Error('Authentication request superseded');
			if (!validIdentity(identity)) throw new Error('Invalid BO identity');
			session = access;
			return identity;
		} catch (error) {
			if (generation === sessionGeneration) {
				session = null;
				// Do not keep a valid refresh cookie if identity verification failed.
				try {
					await api<void>('/apibo/auth/browser/logout', {
						method: 'POST',
						credentials: 'include'
					});
				} catch {
					// Local session remains closed if the network is unavailable.
				}
			}
			throw error;
		}
	})();
	pendingLogin = operation;
	try {
		return await operation;
	} finally {
		if (pendingLogin === operation) pendingLogin = null;
	}
}

/**
 * Complete a 2FA challenge without exposing the HttpOnly BO refresh secret.
 * Full session state is committed only after /apibo/auth/me succeeds.
 */
export async function completeBoSecondFactor(code: string): Promise<string[]> {
	const pending = pendingBoSecondFactor();
	if (!pending) throw new Error('No active second-factor challenge.');
	const generation = sessionGeneration;
	const access = await api<BrowserAccess & { recovery_codes?: string[] }>(
		'/apibo/auth/browser/second-factor',
		{
			method: 'POST',
			credentials: 'include',
			body: JSON.stringify({ challenge: pending.challenge, code })
		}
	);
	if (generation !== sessionGeneration) throw new Error('Authentication request superseded');
	// The successful response consumed the challenge; do not retain a replayable copy.
	clearPendingBoSecondFactor();
	if (!validAccess(access)) throw new Error('Invalid second-factor response');
	const identity = await api<BoIdentity>('/apibo/auth/me', { accessToken: access.access_token });
	if (generation !== sessionGeneration || !validIdentity(identity)) {
		throw new Error('Invalid BO identity after 2FA');
	}
	session = {
		access_token: access.access_token,
		expires_at: access.expires_at,
		token_type: 'Bearer'
	};
	return Array.isArray(access.recovery_codes) ? access.recovery_codes : [];
}

/** Full page reload: recover the access token from the server cookie. */
export async function currentBo(): Promise<BoIdentity | null> {
	const current = await accessTokens();
	const generation = sessionGeneration;
	if (!current) return null;
	try {
		const identity = await api<BoIdentity>('/apibo/auth/me', {
			accessToken: current.access_token
		});
		if (generation !== sessionGeneration || session !== current) return null;
		if (!validIdentity(identity)) {
			session = null;
			return null;
		}
		return identity;
	} catch {
		if (generation === sessionGeneration && session === current) session = null;
		return null;
	}
}

/** Revoke the backend refresh family even when no access token is in memory. */
export async function logoutBo(): Promise<void> {
	clearPendingBoSecondFactor();
	const generation = ++sessionGeneration;
	const priorRefresh = pendingRefresh?.promise;
	const priorLogin = pendingLogin;
	session = null;
	pendingRefresh = null;
	if (priorRefresh || priorLogin) {
		await Promise.allSettled([priorRefresh, priorLogin].filter((p) => p !== null));
	}
	if (generation !== sessionGeneration) return;
	try {
		await api<void>('/apibo/auth/browser/logout', {
			method: 'POST',
			credentials: 'include'
		});
	} catch {
		// Local session remains closed, even if remote revocation fails.
	}
}

/** Module APIs never send refresh cookies, only the short-lived Bearer. */
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
