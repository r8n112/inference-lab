import { describe, expect, it, vi } from 'vitest';

import {
	buildSystemPrompt,
	runAgent,
	safeParseArguments,
	toModelMessages,
	type AgentEvent,
	type ModelCall
} from './agent';
import type { ChatMessage } from '$lib/inference/types';

function reply(text: string, toolCalls: ModelReplyCalls = []) {
	return { text, toolCalls, usage: undefined };
}
type ModelReplyCalls = Array<{
	id: string;
	type: 'function';
	function: { name: string; arguments: string };
}>;

describe('safeParseArguments', () => {
	it('parses a valid object', () => {
		expect(safeParseArguments('{"a":1}')).toEqual({ a: 1 });
	});
	it('returns an empty object for junk', () => {
		expect(safeParseArguments('not json')).toEqual({});
		expect(safeParseArguments('[1,2]')).toEqual({});
	});
});

describe('buildSystemPrompt', () => {
	it('adds the tool protocol only in prompt mode', () => {
		expect(buildSystemPrompt('prompt')).toContain('```tool');
		expect(buildSystemPrompt('native')).not.toContain('```tool');
	});
});

describe('toModelMessages', () => {
	it('is a no-op in native mode', () => {
		const messages: ChatMessage[] = [{ role: 'assistant', content: '', tool_calls: [] }];
		expect(toModelMessages(messages, 'native')).toBe(messages);
	});

	it('rewrites tool calls and results as text in prompt mode', () => {
		const messages: ChatMessage[] = [
			{
				role: 'assistant',
				content: '',
				tool_calls: [
					{
						id: 'c1',
						type: 'function',
						function: { name: 'summarize', arguments: '{"length":"bullets"}' }
					}
				]
			},
			{ role: 'tool', tool_call_id: 'c1', name: 'summarize', content: '- point' }
		];
		const adapted = toModelMessages(messages, 'prompt');
		expect(String(adapted[0].content)).toContain('```tool');
		expect(String(adapted[0].content)).toContain('summarize');
		expect(String(adapted[1].content)).toContain('Tool result');
		expect(String(adapted[1].content)).toContain('- point');
		expect(adapted[1].role).toBe('user');
	});
});

describe('runAgent — native mode', () => {
	it('executes a tool call, then returns the final answer', async () => {
		const calls: string[] = [];
		const model: ModelCall = vi.fn(async (messages: ChatMessage[]) => {
			// First turn: request a tool. Second turn: final answer.
			const hasToolResult = messages.some((message) => message.role === 'tool');
			return hasToolResult
				? reply('Done: summarized.')
				: reply('', [
						{
							id: 'c1',
							type: 'function',
							function: { name: 'summarize', arguments: '{"length":"bullets"}' }
						}
					]);
		});
		const execute = vi.fn(async (name, args) => {
			calls.push(`${name}:${JSON.stringify(args)}`);
			return '- one\n- two';
		});

		const events: AgentEvent[] = [];
		const messages = await runAgent({
			history: [{ role: 'user', content: 'summarize this' }],
			call: model,
			execute,
			toolMode: 'native',
			system: 'sys',
			onEvent: (event) => events.push(event)
		});

		expect(model).toHaveBeenCalledTimes(2);
		expect(execute).toHaveBeenCalledTimes(1);
		expect(calls[0]).toBe('summarize:{"length":"bullets"}');
		expect(events.some((event) => event.type === 'tool_start')).toBe(true);
		expect(events.some((event) => event.type === 'tool_result')).toBe(true);
		const last = messages[messages.length - 1];
		expect(last.role).toBe('assistant');
		expect(last.content).toBe('Done: summarized.');
	});

	it('passes native tools to the model only in native mode', async () => {
		const seen: Array<boolean> = [];
		const model: ModelCall = async (_messages, options) => {
			seen.push(Boolean(options.tools?.length));
			return reply('hi');
		};
		await runAgent({
			history: [{ role: 'user', content: 'hi' }],
			call: model,
			execute: async () => '',
			toolMode: 'native',
			onEvent: () => {}
		});
		await runAgent({
			history: [{ role: 'user', content: 'hi' }],
			call: model,
			execute: async () => '',
			toolMode: 'prompt',
			onEvent: () => {}
		});
		expect(seen).toEqual([true, false]);
	});
});

describe('runAgent — prompt mode', () => {
	it('parses a tool directive, runs it, then answers', async () => {
		const model: ModelCall = vi.fn(async (messages: ChatMessage[]) => {
			const hasToolResult = messages.some(
				(message) =>
					typeof message.content === 'string' && message.content.startsWith('Tool result')
			);
			return hasToolResult
				? reply('All done.')
				: reply('```tool\n{"name":"extract","arguments":{"text":"x"}}\n```');
		});
		const execute = vi.fn(async () => '{"ok":true}');

		const messages = await runAgent({
			history: [{ role: 'user', content: 'extract' }],
			call: model,
			execute,
			toolMode: 'prompt',
			onEvent: () => {}
		});

		expect(execute).toHaveBeenCalledOnce();
		expect(messages[messages.length - 1].content).toBe('All done.');
	});

	it('answers directly when no tool is requested', async () => {
		const model: ModelCall = vi.fn(async () => reply('Just an answer.'));
		const execute = vi.fn(async () => 'nope');
		const messages = await runAgent({
			history: [{ role: 'user', content: 'hello' }],
			call: model,
			execute,
			toolMode: 'prompt',
			onEvent: () => {}
		});
		expect(execute).not.toHaveBeenCalled();
		expect(messages[1].content).toBe('Just an answer.');
	});
});
