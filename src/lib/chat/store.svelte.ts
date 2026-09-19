/**
 * Conversation state for the chat interface, persisted to `localStorage`.
 *
 * Only user/assistant/tool messages are stored (never the system prompt). The
 * transcript uses the native OpenAI shape so it renders identically whether the
 * model used native function calling or the prompt protocol.
 */

import type { ChatMessage } from '$lib/inference/types';

const STORAGE_KEY = 'inference-lab.chat.v1';
const MAX_MESSAGES = 80;

function load(): ChatMessage[] {
	if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
	} catch {
		return [];
	}
}

class ChatStore {
	#messages = $state<ChatMessage[]>(load());

	get messages(): ChatMessage[] {
		return this.#messages;
	}

	get isEmpty(): boolean {
		return this.#messages.length === 0;
	}

	/** Replace the transcript, dropping the system prompt and trimming length. */
	set(messages: ChatMessage[]): void {
		this.#messages = messages.filter((message) => message.role !== 'system').slice(-MAX_MESSAGES);
		this.#persist();
	}

	clear(): void {
		this.#messages = [];
		this.#persist();
	}

	#persist(): void {
		if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#messages));
		} catch {
			// Quota / private-mode failures must not break the app.
		}
	}
}

export const chat = new ChatStore();
