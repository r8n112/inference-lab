/**
 * Pure conversation helpers (no runes), so they can be unit-tested in a plain
 * Node environment. The reactive store lives in `conversations.svelte.ts`.
 */

import type { ChatMessage } from '$lib/inference/types';

export const NEW_CHAT_TITLE = 'New chat';
export const MAX_TITLE = 48;

export interface Conversation {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	messages: ChatMessage[];
}

export function uid(): string {
	return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function textOf(message: ChatMessage): string {
	if (typeof message.content === 'string') return message.content;
	return message.content
		.filter((part) => part.type === 'text')
		.map((part) => (part.type === 'text' ? part.text : ''))
		.join(' ');
}

/** Derive a conversation title from its messages. */
export function titleFrom(messages: ChatMessage[]): string {
	for (const message of messages) {
		if (message.role !== 'user') continue;
		const clean = textOf(message).replace(/\s+/g, ' ').trim();
		if (clean) return clean.length > MAX_TITLE ? `${clean.slice(0, MAX_TITLE - 1)}…` : clean;
	}
	return NEW_CHAT_TITLE;
}

export function makeConversation(messages: ChatMessage[] = []): Conversation {
	const now = Date.now();
	return { id: uid(), title: titleFrom(messages), createdAt: now, updatedAt: now, messages };
}

/** Compact relative time, e.g. "now", "5m", "3h", "2d". */
export function relativeTime(timestamp: number, now = Date.now()): string {
	const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
	if (seconds < 45) return 'now';
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.round(hours / 24);
	if (days < 7) return `${days}d`;
	return new Date(timestamp).toLocaleDateString();
}
