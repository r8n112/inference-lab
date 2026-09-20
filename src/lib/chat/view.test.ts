import { describe, expect, it } from 'vitest';

import { titleFrom } from './conversations';
import { toView } from './view';
import type { ChatMessage } from '$lib/inference/types';

describe('titleFrom', () => {
	it('uses the first user message, collapsing whitespace', () => {
		const messages: ChatMessage[] = [{ role: 'user', content: '  Summarize   this\nplease  ' }];
		expect(titleFrom(messages)).toBe('Summarize this please');
	});

	it('truncates long titles', () => {
		const title = titleFrom([{ role: 'user', content: 'x'.repeat(120) }]);
		expect(title.length).toBeLessThanOrEqual(48);
		expect(title.endsWith('…')).toBe(true);
	});

	it('reads text parts from multimodal content', () => {
		const messages: ChatMessage[] = [
			{
				role: 'user',
				content: [
					{ type: 'text', text: 'describe this image' },
					{ type: 'image_url', image_url: { url: 'data:' } }
				]
			}
		];
		expect(titleFrom(messages)).toBe('describe this image');
	});

	it('falls back for an empty conversation', () => {
		expect(titleFrom([])).toBe('New chat');
		expect(titleFrom([{ role: 'assistant', content: 'hi' }])).toBe('New chat');
	});
});

describe('toView', () => {
	it('passes through user and assistant messages', () => {
		const views = toView([
			{ role: 'user', content: 'hi' },
			{ role: 'assistant', content: 'hello' }
		]);
		expect(views.map((view) => view.kind)).toEqual(['user', 'assistant']);
	});

	it('collapses a tool call and its result into a tools view', () => {
		const views = toView([
			{ role: 'user', content: 'summarize' },
			{
				role: 'assistant',
				content: '',
				tool_calls: [
					{ id: 'c1', type: 'function', function: { name: 'summarize', arguments: '{}' } }
				]
			},
			{ role: 'tool', tool_call_id: 'c1', name: 'summarize', content: '- a\n- b' },
			{ role: 'assistant', content: 'Done.' }
		]);
		expect(views.map((view) => view.kind)).toEqual(['user', 'tools', 'assistant']);
		const tools = views[1];
		if (tools.kind !== 'tools') throw new Error('expected tools view');
		expect(tools.items[0]).toMatchObject({ name: 'summarize', ok: true });
		expect(tools.items[0].result).toContain('- a');
	});

	it('marks a failed tool result', () => {
		const views = toView([
			{
				role: 'assistant',
				content: '',
				tool_calls: [{ id: 'c1', type: 'function', function: { name: 'x', arguments: '{}' } }]
			},
			{ role: 'tool', tool_call_id: 'c1', name: 'x', content: 'Error: boom' }
		]);
		const tools = views[0];
		if (tools.kind !== 'tools') throw new Error('expected tools view');
		expect(tools.items[0].ok).toBe(false);
	});

	it('keeps assistant text that accompanies tool calls', () => {
		const views = toView([
			{
				role: 'assistant',
				content: 'Let me check that.',
				tool_calls: [{ id: 'c1', type: 'function', function: { name: 'x', arguments: '{}' } }]
			},
			{ role: 'tool', tool_call_id: 'c1', name: 'x', content: 'ok' }
		]);
		expect(views.map((view) => view.kind)).toEqual(['tools', 'assistant']);
	});
});
