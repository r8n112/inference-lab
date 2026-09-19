/** Minimal OpenAI-compatible wire types (only what this app uses). */

export type Role = 'system' | 'user' | 'assistant' | 'tool';

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

/** A tool invocation requested by the model. */
export interface ToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		/** A JSON string, as sent by OpenAI-compatible servers. */
		arguments: string;
	};
}

export interface ChatMessage {
	role: Role;
	content: Content;
	/** Present on assistant messages that request tools. */
	tool_calls?: ToolCall[];
	/** Present on `role: 'tool'` result messages. */
	tool_call_id?: string;
	name?: string;
}

/** A JSON Schema object (the subset we generate). */
export interface JsonSchema {
	type: 'object';
	properties: Record<string, unknown>;
	required?: string[];
	additionalProperties?: boolean;
}

export interface ToolFunctionDef {
	name: string;
	description: string;
	parameters: JsonSchema;
}

/** A tool definition in the OpenAI `tools` format. */
export interface ToolDef {
	type: 'function';
	function: ToolFunctionDef;
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
	stream_options?: { include_usage?: boolean };
	tools?: ToolDef[];
	tool_choice?: 'auto' | 'none' | 'required';
}

export interface ChatCompletionChunk {
	choices?: Array<{
		delta?: {
			content?: string | null;
			tool_calls?: Array<{
				index: number;
				id?: string;
				type?: 'function';
				function?: { name?: string; arguments?: string };
			}>;
		};
		finish_reason?: string | null;
	}>;
	usage?: TokenUsage | null;
}
