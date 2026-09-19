/**
 * The agent loop behind the chat interface.
 *
 * The transcript is always stored in the native OpenAI shape (assistant
 * messages may carry `tool_calls`, followed by `tool` result messages). When
 * the endpoint does not support native function calling, `toModelMessages`
 * adapts that transcript into a plain-text tool protocol on the way out, so the
 * UI and history model are identical in both modes.
 */

import type { ChatMessage, TokenUsage, ToolCall, ToolDef } from '$lib/inference/types';
import { parseToolDirective, promptToolProtocol, toolDefs } from './tools';

export type ToolMode = 'native' | 'prompt';

export interface ModelReply {
	text: string;
	toolCalls: ToolCall[];
	usage?: TokenUsage;
}

export interface ModelCallOptions {
	tools?: ToolDef[];
	signal?: AbortSignal;
	onDelta?: (delta: string) => void;
}

export type ModelCall = (messages: ChatMessage[], options: ModelCallOptions) => Promise<ModelReply>;

export type ToolExecutor = (
	name: string,
	args: Record<string, unknown>,
	signal?: AbortSignal
) => Promise<string>;

export interface ToolCallView {
	id: string;
	name: string;
	/** JSON string, as produced by the model. */
	arguments: string;
}

export type AgentEvent =
	| { type: 'delta'; text: string }
	| { type: 'tool_start'; call: ToolCallView }
	| { type: 'tool_result'; call: ToolCallView; result: string }
	| { type: 'assistant'; message: ChatMessage };

export interface RunAgentOptions {
	history: ChatMessage[];
	call: ModelCall;
	execute: ToolExecutor;
	toolMode: ToolMode;
	system?: string;
	signal?: AbortSignal;
	onEvent: (event: AgentEvent) => void;
	maxSteps?: number;
}

export const SYSTEM_PROMPT = [
	'You are Inference Lab, a concise and helpful assistant.',
	'Be direct and accurate. Use Markdown for structure and code. Never invent facts.',
	'If you are unsure, say so. Keep answers focused on what was asked.'
].join(' ');

/** The system prompt for a mode, including the fallback protocol when needed. */
export function buildSystemPrompt(toolMode: ToolMode, extra?: string): string {
	const base = extra ? `${SYSTEM_PROMPT}\n\n${extra}` : SYSTEM_PROMPT;
	return toolMode === 'prompt' ? `${base}\n\n${promptToolProtocol()}` : base;
}

/** Parse a tool-call arguments string defensively. */
export function safeParseArguments(value: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(value || '{}');
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function toView(call: ToolCall): ToolCallView {
	return { id: call.id, name: call.function.name, arguments: call.function.arguments };
}

/**
 * Adapt the native transcript for a prompt-mode endpoint: assistant tool calls
 * become a ```tool directive, and tool results become a user turn.
 */
export function toModelMessages(messages: ChatMessage[], mode: ToolMode): ChatMessage[] {
	if (mode === 'native') return messages;
	return messages.map((message) => {
		if (message.role === 'assistant' && message.tool_calls?.length) {
			const [first] = message.tool_calls;
			const directive = {
				name: first.function.name,
				arguments: safeParseArguments(first.function.arguments)
			};
			return { role: 'assistant', content: '```tool\n' + JSON.stringify(directive) + '\n```' };
		}
		if (message.role === 'tool') {
			const text = typeof message.content === 'string' ? message.content : '';
			const label = message.name ? ` (${message.name})` : '';
			return { role: 'user', content: `Tool result${label}:\n${text}` };
		}
		return message;
	});
}

async function runToolCalls(
	views: ToolCallView[],
	messages: ChatMessage[],
	execute: ToolExecutor,
	signal: AbortSignal | undefined,
	onEvent: (event: AgentEvent) => void
): Promise<void> {
	for (const view of views) {
		onEvent({ type: 'tool_start', call: view });
		let result: string;
		try {
			result = await execute(view.name, safeParseArguments(view.arguments), signal);
		} catch (error) {
			result = `Error: ${(error as Error).message}`;
		}
		messages.push({ role: 'tool', tool_call_id: view.id, name: view.name, content: result });
		onEvent({ type: 'tool_result', call: view, result });
	}
}

/**
 * Run one user turn to completion, executing any tools the model asks for.
 *
 * Returns the full message list (native shape). Emits `delta` events while the
 * model streams, and `tool_start`/`tool_result`/`assistant` around tool use.
 */
export async function runAgent({
	history,
	call,
	execute,
	toolMode,
	system,
	signal,
	onEvent,
	maxSteps = 5
}: RunAgentOptions): Promise<ChatMessage[]> {
	const messages: ChatMessage[] = [
		...(system ? [{ role: 'system', content: system } as ChatMessage] : []),
		...history
	];

	for (let step = 0; step < maxSteps; step += 1) {
		const modelMessages = toolMode === 'prompt' ? toModelMessages(messages, 'prompt') : messages;
		const reply = await call(modelMessages, {
			tools: toolMode === 'native' ? toolDefs() : undefined,
			signal,
			onDelta: (delta) => onEvent({ type: 'delta', text: delta })
		});

		if (toolMode === 'native' && reply.toolCalls.length > 0) {
			messages.push({ role: 'assistant', content: reply.text, tool_calls: reply.toolCalls });
			await runToolCalls(reply.toolCalls.map(toView), messages, execute, signal, onEvent);
			continue;
		}

		if (toolMode === 'prompt') {
			const directive = parseToolDirective(reply.text);
			if (directive) {
				const call: ToolCall = {
					id: `call_${step}_${directive.name}`,
					type: 'function',
					function: { name: directive.name, arguments: JSON.stringify(directive.arguments) }
				};
				messages.push({ role: 'assistant', content: '', tool_calls: [call] });
				await runToolCalls([toView(call)], messages, execute, signal, onEvent);
				continue;
			}
		}

		const message: ChatMessage = { role: 'assistant', content: reply.text };
		messages.push(message);
		onEvent({ type: 'assistant', message });
		return messages;
	}

	// Safety valve: stop after maxSteps and surface whatever we have.
	const last = messages[messages.length - 1];
	if (last) onEvent({ type: 'assistant', message: last });
	return messages;
}
