/**
 * Turn a stored transcript into a render list.
 *
 * Assistant messages that request tools are collapsed together with their
 * results into a single `tools` view, so the UI shows a tidy trace instead of
 * the raw protocol messages.
 */

import type { ChatMessage } from '$lib/inference/types';

export interface ToolTraceItem {
	name: string;
	/** `undefined` while the tool is still running. */
	ok: boolean | undefined;
	result?: string;
}

export type ChatView =
	| { kind: 'user'; message: ChatMessage }
	| { kind: 'assistant'; message: ChatMessage }
	| { kind: 'tools'; items: ToolTraceItem[] };

export function toView(messages: ChatMessage[]): ChatView[] {
	const results = new Map<string, string>();
	for (const message of messages) {
		if (message.role === 'tool' && message.tool_call_id) {
			results.set(message.tool_call_id, typeof message.content === 'string' ? message.content : '');
		}
	}

	const views: ChatView[] = [];
	for (const message of messages) {
		if (message.role === 'system' || message.role === 'tool') continue;

		if (message.role === 'assistant' && message.tool_calls?.length) {
			const items: ToolTraceItem[] = message.tool_calls.map((call) => {
				const result = results.get(call.id);
				return {
					name: call.function.name,
					ok: result === undefined ? undefined : !result.startsWith('Error'),
					result
				};
			});
			views.push({ kind: 'tools', items });
			if (typeof message.content === 'string' && message.content.trim()) {
				views.push({ kind: 'assistant', message });
			}
			continue;
		}

		if (message.role === 'user') views.push({ kind: 'user', message });
		else views.push({ kind: 'assistant', message });
	}

	return views;
}
