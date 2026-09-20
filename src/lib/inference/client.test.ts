import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	chat,
	InferenceError,
	listModels,
	normalizeToken,
	streamChat,
	tokenFingerprint
} from './client';

function sseResponse(frames: string[]): Response {
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const frame of frames) controller.enqueue(encoder.encode(frame));
			controller.close();
		}
	});
	return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('normalizeToken', () => {
	it('trims whitespace and newlines from a wrapped paste', () => {
		expect(normalizeToken('  abc\n')).toBe('abc');
		expect(normalizeToken('a\nb c')).toBe('abc');
	});

	it('strips surrounding quotes', () => {
		expect(normalizeToken('"abc"')).toBe('abc');
		expect(normalizeToken("'abc'")).toBe('abc');
	});

	it('strips an accidental Bearer prefix', () => {
		expect(normalizeToken('Bearer abc')).toBe('abc');
		expect(normalizeToken('bearer  abc')).toBe('abc');
		expect(normalizeToken('Bearer "abc"')).toBe('abc');
	});

	it('leaves a clean token unchanged', () => {
		expect(normalizeToken('sk-abc123')).toBe('sk-abc123');
	});
});

describe('tokenFingerprint', () => {
	it('never reveals the token', () => {
		expect(tokenFingerprint('')).toBe('none');
		expect(tokenFingerprint('short')).toBe('len 5');
		expect(tokenFingerprint('abcdefghij')).toBe('len 10 · abc…hij');
		expect(tokenFingerprint('abcdefghij')).not.toContain('defg');
	});
});

describe('streamChat', () => {
	it('streams deltas and returns the joined text with usage', async () => {
		const frames = [
			'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
			'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
			'data: {"choices":[{"delta":{}}],"usage":{"completion_tokens":2}}\n\n',
			'data: [DONE]\n\n'
		];
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => sseResponse(frames))
		);

		const seen: string[] = [];
		const deltas: string[] = [];
		for await (const delta of streamChat({
			baseUrl: 'https://example.test/api/v1',
			token: 'secret',
			model: 'm',
			messages: [{ role: 'user', content: 'hi' }],
			onDelta: (d) => deltas.push(d)
		})) {
			seen.push(delta);
		}

		expect(seen.join('')).toBe('Hello');
		expect(deltas.join('')).toBe('Hello');

		const result = await chat({
			baseUrl: 'https://example.test/api/v1',
			token: 'secret',
			model: 'm',
			messages: [{ role: 'user', content: 'hi' }]
		});
		expect(result.text).toBe('Hello');
		expect(result.usage?.completion_tokens).toBe(2);
	});

	it('sends a bearer token and the configured model', async () => {
		const fetchMock = vi.fn(
			async (_url: string, _init?: RequestInit) =>
				new Response(
					new ReadableStream<Uint8Array>({
						start(controller) {
							controller.close();
						}
					}),
					{ status: 200 }
				)
		);
		vi.stubGlobal('fetch', fetchMock);

		await chat({
			baseUrl: 'https://example.test/api/v1',
			token: 'secret',
			model: 'Qwen/Qwen3.6-35B-A3B-FP8',
			messages: [{ role: 'user', content: 'hi' }]
		});

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://example.test/api/v1/chat/completions');
		expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer secret');
		expect(JSON.parse(String(init?.body)).model).toBe('Qwen/Qwen3.6-35B-A3B-FP8');
	});

	it('normalizes a noisy token before sending it', async () => {
		const fetchMock = vi.fn(
			async (_url: string, _init?: RequestInit) =>
				new Response(
					new ReadableStream<Uint8Array>({
						start(controller) {
							controller.close();
						}
					}),
					{ status: 200 }
				)
		);
		vi.stubGlobal('fetch', fetchMock);

		await chat({
			baseUrl: 'https://example.test/api/v1',
			token: '  Bearer "abc123"\n',
			model: 'm',
			messages: [{ role: 'user', content: 'hi' }]
		});

		const [, init] = fetchMock.mock.calls[0];
		expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer abc123');
	});
});

describe('errors', () => {
	it('marks 401 as non-retryable and adds a hint', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }))
		);
		await expect(
			chat({
				baseUrl: 'https://example.test/api/v1',
				token: 'bad',
				model: 'm',
				messages: [{ role: 'user', content: 'hi' }]
			})
		).rejects.toMatchObject({ status: 401, retryable: false });
	});

	it('marks 429 as retryable', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('slow down', { status: 429 }))
		);
		const error = await chat({
			baseUrl: 'https://example.test/api/v1',
			token: 't',
			model: 'm',
			messages: [{ role: 'user', content: 'hi' }]
		}).catch((caught) => caught);
		expect(error).toBeInstanceOf(InferenceError);
		expect(error.retryable).toBe(true);
		expect(error.status).toBe(429);
	});

	it('wraps a transport failure as a retryable error with a hint', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('Failed to fetch');
			})
		);
		const error = await chat({
			baseUrl: 'https://inference.hetzner.com/api/v1',
			token: 't',
			model: 'm',
			messages: [{ role: 'user', content: 'hi' }]
		}).catch((caught) => caught);
		expect(error).toBeInstanceOf(InferenceError);
		expect(error.retryable).toBe(true);
		expect(error.status).toBeUndefined();
		expect(error.message).toContain('Could not reach https://inference.hetzner.com/api/v1');
		expect(error.message).toContain('network connection');
	});

	it('does not swallow an abort', async () => {
		const abort = new Error('aborted');
		abort.name = 'AbortError';
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw abort;
			})
		);
		const error = await chat({
			baseUrl: 'https://example.test/api/v1',
			token: 't',
			model: 'm',
			messages: [{ role: 'user', content: 'hi' }]
		}).catch((caught) => caught);
		expect(error.name).toBe('AbortError');
		expect(error).not.toBeInstanceOf(InferenceError);
	});
});

describe('listModels', () => {
	it('returns the model ids', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(
						JSON.stringify({
							data: [{ id: 'Qwen/Qwen3.6-35B-A3B-FP8' }, { id: 'Qwen3.8-27B' }]
						}),
						{ status: 200 }
					)
			)
		);
		const models = await listModels('https://example.test/api/v1', 't');
		expect(models.map((m) => m.id)).toEqual(['Qwen/Qwen3.6-35B-A3B-FP8', 'Qwen3.8-27B']);
	});
});
