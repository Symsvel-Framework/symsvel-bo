import { localizedApiPath, type ApiLocaleOptions } from './locales';

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code?: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export type ApiRequestInit = RequestInit &
	ApiLocaleOptions & {
		/** Public requests never receive credentials or Authorization headers. */
		public?: boolean;
		/** Optional access token supplied by the Auth integration. */
		accessToken?: string;
	};

export function apiBaseUrl(): string {
	const configured = import.meta.env.PUBLIC_API_URL?.trim();
	if (configured) return configured.replace(/\/$/, '');
	if (typeof window === 'undefined') {
		throw new Error('PUBLIC_API_URL is required outside the browser.');
	}
	const { protocol, hostname, port } = window.location;
	const backendHostname = hostname.startsWith('bo.') ? `backend.${hostname.slice(3)}` : hostname;
	return `${protocol}//${backendHostname}${port ? `:${port}` : ''}`;
}

export async function api<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
	const {
		public: isPublic = false,
		accessToken,
		skipLocales,
		uiLang,
		translationLang,
		...requestInit
	} = init;
	if (!path.startsWith('/') || path.startsWith('//') || /[\\\r\n]/.test(path)) {
		throw new Error('API paths must be root-relative.');
	}
	const headers = new Headers(requestInit.headers);
	headers.set('Accept', 'application/json');
	if (requestInit.body && !headers.has('Content-Type') && !(requestInit.body instanceof FormData)) {
		headers.set('Content-Type', 'application/json');
	}
	if (isPublic) {
		headers.delete('Authorization');
		headers.delete('Cookie');
		headers.delete('Proxy-Authorization');
	} else if (accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`);
	}
	const response = await fetch(
		`${apiBaseUrl()}${localizedApiPath(path, { skipLocales, uiLang, translationLang })}`,
		{
			...requestInit,
			credentials: isPublic ? 'omit' : requestInit.credentials,
			headers
		}
	);
	if (response.ok && response.status === 204) return undefined as T;
	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		const error = payload?.error;
		throw new ApiError(
			typeof error?.message === 'string' ? error.message : 'API request failed.',
			response.status,
			typeof error?.code === 'string' ? error.code : undefined
		);
	}
	return payload as T;
}
