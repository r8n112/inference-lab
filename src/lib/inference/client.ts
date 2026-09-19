/**
 * A small, correct OpenAI-compatible client for the Hetzner Experiments
 * Inference API.
 *
 * Design notes:
 * - The browser calls the API directly (its CORS policy allows it), so there is
 *   no backend and the token never leaves the device except to the API itself.
 * - Streaming uses `fetch` + SSE parsing rather than EventSource, because the
 *   request is a POST with a body and needs an `Authorization` header.
 * - Errors are normalised into `InferenceError` with a human message and a
 *   `retryable` flag so the UI can offer "try again" without retry storms.
 */

import type { ChatCompletionChunk, ChatRequest, Model, TokenUsage } from './types';

export interface ChatResult {
	text: string;
	usage?: TokenUsage;
}

/** A non-2xx response from the inference API, or a transport failure. */
export class InferenceError extends Error {
	readonly status?: number;
	readonly retryable: boolean;

	constructor(message: string, status?: number, retryable = false) {
		super(message);
		this.name = 'InferenceError';
		this.status = status;
		this.retryable = retryable;
	}
}

interface ChatParams extends Omit<ChatRequest, 'stream' | 'stream_options'> {
	baseUrl: string;
	token: string;
	signal?: AbortSignal;
	/** Called for every streamed delta (so callers can render incrementally). */
	onDelta?: (delta: string) => void;
}

function join(baseUrl: string, path: string): string {
	return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function authHeaders(token: string): Record<string, string> {
	return {
		'Content-Type': 'application/json',
		...(token ? { Authorization: `Bearer ${token}` } : {})
	};
}

/** Extract a readable message from the API's several error shapes. */
async function errorFrom(response: Response): Promise<InferenceError> {
	let detail = `${response.status} ${response.statusText}`.trim();
	try {
		const body = await response.json();
		if (typeof body?.error === 'string') detail = body.error;
		else if (typeof body?.error?.message === 'string') detail = body.error.message;
		else if (typeof body?.message === 'string') detail = body.message;
	} catch {
		// Body was not JSON; keep the HTTP status line.
	}

	const retryable = response.status === 429 || response.status >= 500;
	const hint =
		response.status === 401
			? 'Check your token in Settings.'
			: response.status === 429
				? 'Rate limited — wait a moment and try again.'
				: response.status === 404
					? 'The endpoint was not found; check the base URL in Settings.'
					: '';
	const message = hint ? `${detail} ${hint}` : detail;
	return new InferenceError(message, response.status, retryable);
}

/** Fetch the list of models the token can use. */
export async function listModels(
	baseUrl: string,
	token: string,
	signal?: AbortSignal
): Promise<Model[]> {
	let response: Response;
	try {
		response = await fetch(join(baseUrl, 'models'), {
			headers: authHeaders(token),
			signal
		});
	} catch (error) {
		throw new InferenceError(
			`Could not reach ${baseUrl}. ${(error as Error).message}`,
			undefined,
			true
		);
	}
	if (!response.ok) throw await errorFrom(response);
	const body = await response.json();
	const data = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
	return data
		.filter((m: Partial<Model>) => typeof m?.id === 'string')
		.map((m: Model) => ({ id: m.id, owned_by: m.owned_by, created: m.created }));
}

/**
 * Send a chat completion and stream the answer.
 *
 * Yields text deltas and resolves with the concatenated text plus usage (when
 * the server reports it).
 */
export async function* streamChat(params: ChatParams): AsyncGenerator<string, ChatResult> {
	const { baseUrl, token, signal, onDelta, ...request } = params;
	const body: ChatRequest = { ...request, stream: true, stream_options: { include_usage: true } };

	let response: Response;
	try {
		response = await fetch(join(baseUrl, 'chat/completions'), {
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(body),
			signal
		});
	} catch (error) {
		if ((error as Error).name === 'AbortError') throw error;
		throw new InferenceError(
			`Could not reach ${baseUrl}. ${(error as Error).message}`,
			undefined,
			true
		);
	}
	if (!response.ok) throw await errorFrom(response);
	if (!response.body) throw new InferenceError('The response had no body.');

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let text = '';
	let usage: TokenUsage | undefined;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		// SSE frames are separated by a blank line; be liberal about \r\n.
		let newlineIndex: number;
		while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
			const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
			buffer = buffer.slice(newlineIndex + 1);
			if (!line.startsWith('data:')) continue;
			const payload = line.slice(5).trim();
			if (payload === '[DONE]') return { text, usage };
			if (!payload) continue;

			let chunk: ChatCompletionChunk;
			try {
				chunk = JSON.parse(payload);
			} catch {
				continue; // Ignore keep-alives and malformed frames.
			}
			if (chunk.usage) usage = chunk.usage;
			const delta = chunk.choices?.[0]?.delta?.content;
			if (delta) {
				text += delta;
				onDelta?.(delta);
				yield delta;
			}
		}
	}
	return { text, usage };
}

/** Convenience wrapper that runs a completion to completion and returns text. */
export async function chat(params: ChatParams): Promise<ChatResult> {
	const generator = streamChat(params);
	let step = await generator.next();
	while (!step.done) step = await generator.next();
	return step.value;
}
