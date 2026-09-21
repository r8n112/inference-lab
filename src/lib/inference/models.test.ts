import { describe, expect, it } from 'vitest';

import { FALLBACK_MODELS, mergeModels } from './models';

describe('mergeModels', () => {
	it('puts the current model first', () => {
		expect(mergeModels('custom-model', []).slice(0, 1)).toEqual(['custom-model']);
	});

	it('includes fetched models before the fallbacks', () => {
		const merged = mergeModels('Qwen/Qwen3.6-35B-A3B-FP8', ['live-a', 'live-b']);
		expect(merged.slice(0, 3)).toEqual(['Qwen/Qwen3.6-35B-A3B-FP8', 'live-a', 'live-b']);
	});

	it('always keeps the known fallbacks', () => {
		const merged = mergeModels('Qwen/Qwen3.6-35B-A3B-FP8', ['live-a']);
		for (const fallback of FALLBACK_MODELS) expect(merged).toContain(fallback);
	});

	it('does not duplicate ids', () => {
		const merged = mergeModels('Qwen3.8-27B', ['Qwen3.8-27B', 'Qwen/Qwen3.6-35B-A3B-FP8']);
		expect(new Set(merged).size).toBe(merged.length);
	});

	it('ignores empty ids', () => {
		expect(mergeModels('', ['', 'x'])).not.toContain('');
	});
});
