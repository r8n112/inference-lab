import { describe, expect, it } from 'vitest';

import {
	CHAT_TOOLS,
	parseToolDirective,
	promptToolProtocol,
	schemaFromFields,
	toolDefs
} from './tools';
import { TOOLS } from '$lib/tools';

describe('schemaFromFields', () => {
	it('maps text, textarea and select fields', () => {
		const schema = schemaFromFields([
			{ kind: 'text', name: 'context', label: 'Context' },
			{ kind: 'textarea', name: 'text', label: 'Text', required: true },
			{ kind: 'select', name: 'tone', label: 'Tone', options: [{ value: 'a', label: 'A' }] }
		]);
		expect(schema.properties).toHaveProperty('context');
		expect(schema.properties).toHaveProperty('tone');
		expect(schema.required).toEqual(['text']);
		expect((schema.properties.tone as { enum: string[] }).enum).toEqual(['a']);
	});

	it('skips image fields', () => {
		const schema = schemaFromFields([
			{ kind: 'image', name: 'image', label: 'Image' },
			{ kind: 'text', name: 'x', label: 'X' }
		]);
		expect(schema.properties).not.toHaveProperty('image');
	});
});

describe('chat tool registry', () => {
	it('exposes every non-vision tool with a matching definition', () => {
		const expected = TOOLS.filter((tool) => !tool.fields.some((f) => f.kind === 'image')).length;
		expect(CHAT_TOOLS).toHaveLength(expected);
		expect(toolDefs()).toHaveLength(expected);
		expect(toolDefs().every((def) => def.type === 'function')).toBe(true);
	});

	it('includes the known tools and excludes the vision tool', () => {
		const names = CHAT_TOOLS.map((tool) => tool.name);
		expect(names).toContain('summarize');
		expect(names).toContain('extract');
		expect(names).not.toContain('describe-image');
	});

	it('mentions every tool in the fallback protocol', () => {
		const protocol = promptToolProtocol();
		for (const tool of CHAT_TOOLS) expect(protocol).toContain(tool.name);
	});
});

describe('parseToolDirective', () => {
	it('parses a fenced tool block', () => {
		const directive = parseToolDirective(
			'Sure.\n```tool\n{"name":"translate","arguments":{"target":"German","text":"hi"}}\n```'
		);
		expect(directive).toEqual({ name: 'translate', arguments: { target: 'German', text: 'hi' } });
	});

	it('parses a bare top-level object', () => {
		const directive = parseToolDirective('{"name":"summarize","arguments":{"length":"bullets"}}');
		expect(directive?.name).toBe('summarize');
	});

	it('ignores unknown tools', () => {
		expect(parseToolDirective('{"name":"nope","arguments":{}}')).toBeUndefined();
	});

	it('does not mistake a json answer for a tool call', () => {
		// The extract tool legitimately replies with ```json — that is a result,
		// not a directive.
		expect(parseToolDirective('```json\n{"name":"summarize"}\n```')).toBeUndefined();
	});

	it('returns undefined for plain prose', () => {
		expect(parseToolDirective('Here is your answer.')).toBeUndefined();
	});
});
