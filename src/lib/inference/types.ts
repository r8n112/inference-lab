/** Minimal OpenAI-compatible wire types (only what this app uses). */

export type Role = 'system' | 'user' | 'assistant';

export interface TextPart {
	type: 'text';
	text: string;
}

export interface ImagePart {
	type: 'image_url';
	image_url: { url: string };
}

export type ContentPart = TextPart | ImagePart;

/** A message's content is plain text or a list of multimodal parts. */
export type Content = string | ContentPart[];

export interface ChatMessage {
	role: Role;
	content: Content;
}

export interface Model {
	id: string;
	object?: string;
	owned_by?: string;
	created?: number;
}

export interface TokenUsage {
	prompt_tokens?: number;
	completion_tokens?: number;
	total_tokens?: number;
}

export interface ChatRequest {
	model: string;
	messages: ChatMessage[];
	temperature?: number;
	max_tokens?: number;
	stream?: boolean;
	/** Ask the server to include a usage object in the final chunk. */
	stream_options?: { include_usage?: boolean };
}

export interface ChatCompletionChunk {
	choices?: Array<{
		delta?: { content?: string | null };
		finish_reason?: string | null;
	}>;
	usage?: TokenUsage | null;
}
