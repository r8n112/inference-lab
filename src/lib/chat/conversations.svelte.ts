/**
 * Multi-conversation reactive store, persisted to `localStorage`.
 *
 * Each conversation stores the native OpenAI message shape (never the system
 * prompt). Pure helpers live in `conversations.ts`.
 */

import type { ChatMessage } from '$lib/inference/types';
import { makeConversation, titleFrom, type Conversation } from './conversations';

export type { Conversation } from './conversations';

const STORAGE_KEY = 'inference-lab.conversations.v1';
const LEGACY_KEY = 'inference-lab.chat.v1';
const MAX_MESSAGES = 200;

interface Persisted {
	conversations: Conversation[];
	activeId: string;
}

function isBrowser(): boolean {
	return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function load(): Persisted {
	const empty: Persisted = { conversations: [], activeId: '' };
	if (!isBrowser()) return empty;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<Persisted>;
			const conversations = Array.isArray(parsed.conversations) ? parsed.conversations : [];
			const activeId =
				typeof parsed.activeId === 'string' && conversations.some((c) => c.id === parsed.activeId)
					? parsed.activeId
					: (conversations[0]?.id ?? '');
			return { conversations, activeId };
		}
		// Migrate the single-conversation format used before multi-chat.
		const legacy = localStorage.getItem(LEGACY_KEY);
		if (legacy) {
			const messages = JSON.parse(legacy);
			if (Array.isArray(messages) && messages.length) {
				const conversation = makeConversation(messages);
				return { conversations: [conversation], activeId: conversation.id };
			}
		}
	} catch {
		// Fall through to an empty store.
	}
	return empty;
}

class ConversationStore {
	#state = $state<Persisted>(load());

	/** Conversations, most recently updated first. */
	get list(): Conversation[] {
		return [...this.#state.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
	}

	get activeId(): string {
		return this.#state.activeId;
	}

	get active(): Conversation | null {
		return this.#state.conversations.find((c) => c.id === this.#state.activeId) ?? null;
	}

	get count(): number {
		return this.#state.conversations.length;
	}

	create(): Conversation {
		const conversation = makeConversation();
		this.#state.conversations = [conversation, ...this.#state.conversations];
		this.#state.activeId = conversation.id;
		this.#persist();
		return conversation;
	}

	select(id: string): void {
		if (this.#state.conversations.some((c) => c.id === id)) {
			this.#state.activeId = id;
			this.#persist();
		}
	}

	remove(id: string): void {
		this.#state.conversations = this.#state.conversations.filter((c) => c.id !== id);
		if (this.#state.activeId === id) {
			this.#state.activeId = this.list[0]?.id ?? '';
		}
		this.#persist();
	}

	rename(id: string, title: string): void {
		const clean = title.trim();
		if (!clean) return;
		this.#patch(id, (conversation) => ({ ...conversation, title: clean }));
	}

	/** Append a single message (used to show the user's turn immediately). */
	appendMessage(id: string, message: ChatMessage): void {
		this.#patch(id, (conversation) => {
			const messages = [...conversation.messages, message];
			return { ...conversation, messages, title: titleFrom(messages), updatedAt: Date.now() };
		});
	}

	/** Replace the transcript (used after a turn completes). */
	setMessages(id: string, messages: ChatMessage[]): void {
		this.#patch(id, (conversation) => {
			const kept = messages.filter((message) => message.role !== 'system').slice(-MAX_MESSAGES);
			return { ...conversation, messages: kept, title: titleFrom(kept), updatedAt: Date.now() };
		});
	}

	clearAll(): void {
		this.#state.conversations = [];
		this.#state.activeId = '';
		this.#persist();
	}

	#patch(id: string, update: (conversation: Conversation) => Conversation): void {
		this.#state.conversations = this.#state.conversations.map((conversation) =>
			conversation.id === id ? update(conversation) : conversation
		);
		this.#persist();
	}

	#persist(): void {
		if (!isBrowser()) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#state));
		} catch {
			// Quota / private-mode failures must not break the app.
		}
	}
}

export const conversations = new ConversationStore();
