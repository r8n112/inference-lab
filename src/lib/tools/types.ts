import type { ContentPart, ChatMessage } from '$lib/inference/types';

/** A form field rendered for a tool. Tools are data, not bespoke components. */
export type ToolField =
	| {
			kind: 'textarea';
			name: string;
			label: string;
			placeholder?: string;
			rows?: number;
			required?: boolean;
			default?: string;
	  }
	| {
			kind: 'text';
			name: string;
			label: string;
			placeholder?: string;
			required?: boolean;
			default?: string;
	  }
	| {
			kind: 'select';
			name: string;
			label: string;
			options: Array<{ value: string; label: string }>;
			default?: string;
	  }
	| {
			kind: 'image';
			name: string;
			label: string;
			help?: string;
	  };

export interface ToolInput {
	/** Field values keyed by name (text/textarea/select); images are data URLs. */
	values: Record<string, string>;
}

export type ToolCategory = 'Write' | 'Code' | 'Data' | 'Analyze' | 'Vision';

export interface ToolMeta {
	id: string;
	name: string;
	tagline: string;
	description: string;
	/** Single emoji is enough and keeps the bundle tiny. */
	icon: string;
	category: ToolCategory;
	/** Shown on the card, e.g. "uses the 262k context window". */
	highlight?: string;
	needsVision?: boolean;
}

export interface Tool extends ToolMeta {
	/** Rendered top-to-bottom. */
	fields: ToolField[];
	/** System prompt. Kept short and explicit: small models reward clarity. */
	system: string;
	/** Build the user turn from the form values. May be multimodal. */
	buildUser: (input: ToolInput) => string | ContentPart[];
	/** Sampling temperature; most tools want deterministic output. */
	temperature?: number;
	/** Trim/format the raw model output before showing it. */
	postProcess?: (text: string) => string;
	/** Rough guidance shown under the run button. */
	note?: string;
}

/** Convenience for building a [system, user] message pair. */
export function messagesFor(tool: Tool, input: ToolInput): ChatMessage[] {
	const user = tool.buildUser(input);
	return [
		{ role: 'system', content: tool.system },
		{ role: 'user', content: user }
	];
}
