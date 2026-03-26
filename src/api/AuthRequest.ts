import { conf } from '../Settings';

/**
 * Universal authenticated fetch wrapper.
 * Detects 401 AUTH_INVALID_ACCESS_TOKEN and coordinates refresh with the UI layer via Settings hooks.
 * Compatible with Browser, Node.js (v18+), and Cloudflare Workers.
 */
export async function authenticatedFetch(
	url: string,
	init: RequestInit = {},
	boardId?: string
): Promise<Response> {
	const getAuthInit = (originalInit: RequestInit): RequestInit => {
		const token = conf.getAccessToken();
		if (!token) {
			return originalInit;
		}

		const headers = new Headers(originalInit.headers);
		headers.set('Authorization', `Bearer ${token}`);
		return { ...originalInit, headers };
	};

	let response = await fetch(url, getAuthInit(init));

	if (response.status === 401) {
		// Clone to read body without consuming the response stream of the potential retry
		const body = await response.clone().json().catch(() => ({}));

		if (body.code === 'AUTH_INVALID_ACCESS_TOKEN') {
			// Trigger UI-implemented refresh hook (e.g. refresh locking happens in the UI layer)
			const refreshed = await conf.onAuthInvalid(boardId);
			if (refreshed) {
				// Retry exactly once with the new access token
				response = await fetch(url, getAuthInit(init));
			} else {
				// Terminal failure notification for the UI
				conf.onAuthTerminalFailure(boardId, body.code);
			}
		}
	}

	return response;
}
