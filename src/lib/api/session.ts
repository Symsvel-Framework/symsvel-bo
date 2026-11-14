import { api } from './client';

export type BoIdentity = { id: number; context: 'bo' };
type LoginTokens = {
	access_token: string;
	refresh_token: string;
	expires_at: string;
	refresh_expires_at: string;
	token_type: 'Bearer';
};

let session: LoginTokens | null = null;

/**
 * Ephemeral BO session. No localStorage, sessionStorage or persistent JS cookies.
 * A full reload intentionally requires a new login until the server-side cookie
 * transport has been validated.
 */
export async function loginBo(email: string, password: string): Promise<BoIdentity> {
	session = null;
	const tokens = await api<LoginTokens>('/apibo/auth/login', {
		method: 'POST',
		public: true,
		body: JSON.stringify({ email, password })
	});
	if (
		tokens.token_type !== 'Bearer' ||
		!tokens.access_token ||
		!tokens.refresh_token ||
		!Number.isFinite(Date.parse(tokens.expires_at))
	) {
		throw new Error('Invalid authentication response');
	}
	try {
		const identity = await api<BoIdentity>('/apibo/auth/me', {
			accessToken: tokens.access_token
		});
		if (identity.context !== 'bo' || !Number.isInteger(identity.id) || identity.id < 1) {
			throw new Error('Invalid BO identity');
		}
		session = tokens;
		return identity;
	} catch (error) {
		session = null;
		throw error;
	}
}

export async function currentBo(): Promise<BoIdentity | null> {
	if (!session || Date.parse(session.expires_at) <= Date.now()) {
		session = null;
		return null;
	}
	try {
		const identity = await api<BoIdentity>('/apibo/auth/me', {
			accessToken: session.access_token
		});
		if (identity.context !== 'bo' || !Number.isInteger(identity.id) || identity.id < 1) {
			session = null;
			return null;
		}
		return identity;
	} catch {
		session = null;
		return null;
	}
}

export async function logoutBo(): Promise<void> {
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
