import { describe, expect, it } from 'vitest';

import { getTool, prettyJson, stripFences, TOOLS } from './index';
import { messagesFor } from './types';

describe('stripFences', () => {
	it('removes a fenced block and its language tag', () => {
		expect(stripFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
	});

	it('leaves unfenced text untouched', () => {
		expect(stripFences('  hello  ')).toBe('hello');
	});
});

describe('prettyJson', () => {
	it('pretty-prints valid JSON', () => {
		expect(prettyJson('{"a":1}')).toBe('{\n  "a": 1\n}');
	});

	it('recovers JSON from prose and fences', () => {
		expect(prettyJson('Sure!\n```json\n{"a": [1,2]}\n```')).toBe(
			'{\n  "a": [\n    1,\n    2\n  ]\n}'
		);
	});

	it('returns the cleaned text when JSON is unrecoverable', () => {
		expect(prettyJson('not json at all')).toBe('not json at all');
	});
});

describe('registry', () => {
	it('exposes every tool with a unique id', () => {
		const ids = TOOLS.map((tool) => tool.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids.length).toBeGreaterThanOrEqual(8);
	});

	it('resolves tools by id', () => {
		expect(getTool('summarize')?.name).toBe('Summarize');
		expect(getTool('nope')).toBeUndefined();
	});
});

describe('prompt building', () => {
	it('builds a system+user pair and injects the chosen options', () => {
		const tool = getTool('translate');
		if (!tool) throw new Error('translate tool missing');
		const messages = messagesFor(tool, {
			values: { target: 'German', text: 'Hello world' }
		});
		expect(messages).toHaveLength(2);
		expect(messages[0].role).toBe('system');
		expect(messages[1].role).toBe('user');
		expect(String(messages[1].content)).toContain('German');
		expect(String(messages[1].content)).toContain('Hello world');
	});

	it('builds a multimodal message for the vision tool', () => {
		const tool = getTool('describe-image');
		if (!tool) throw new Error('describe-image tool missing');
		const content = tool.buildUser({
			values: { mode: 'concise alt text (one sentence)', image: 'data:image/png;base64,AAAA' }
		});
		expect(Array.isArray(content)).toBe(true);
		const parts = content as Array<{ type: string }>;
		expect(parts.some((part) => part.type === 'text')).toBe(true);
		expect(parts.some((part) => part.type === 'image_url')).toBe(true);
	});

	it('omits the image part when no image is provided', () => {
		const tool = getTool('describe-image');
		if (!tool) throw new Error('describe-image tool missing');
		const content = tool.buildUser({ values: { mode: 'concise alt text (one sentence)' } });
		const parts = content as Array<{ type: string }>;
		expect(parts.some((part) => part.type === 'image_url')).toBe(false);
	});
});
