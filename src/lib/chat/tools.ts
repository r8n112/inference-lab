/**
 * Chat tools: the existing form tools exposed as callable functions.
 *
 * The function schemas are derived from the tool field definitions, so a new
 * tool automatically becomes a chat tool with no extra wiring. Image-based
 * tools are excluded because a model cannot pass an image as a JSON argument;
 * the chat handles images natively instead.
 */

import type { JsonSchema, ToolDef } from '$lib/inference/types';
import { TOOLS } from '$lib/tools';
import type { Tool, ToolField } from '$lib/tools/types';

export interface ChatTool {
	/** Function name; equals the tool id. */
	name: string;
	tool: Tool;
	description: string;
	parameters: JsonSchema;
}

function schemaForField(field: ToolField): Record<string, unknown> | undefined {
	switch (field.kind) {
		case 'text':
		case 'textarea':
			return { type: 'string', description: field.label };
		case 'select':
			return {
				type: 'string',
				enum: field.options.map((option) => option.value),
				description: field.label
			};
		default:
			return undefined; // image fields are not representable as arguments
	}
}

/** Build an object schema from a tool's fields. */
export function schemaFromFields(fields: ToolField[]): JsonSchema {
	const properties: Record<string, unknown> = {};
	const required: string[] = [];
	for (const field of fields) {
		const schema = schemaForField(field);
		if (!schema) continue;
		properties[field.name] = schema;
		if ('required' in field && field.required) required.push(field.name);
	}
	const result: JsonSchema = { type: 'object', properties, additionalProperties: false };
	if (required.length) result.required = required;
	return result;
}

export const CHAT_TOOLS: ChatTool[] = TOOLS.filter(
	(tool) => !tool.fields.some((field) => field.kind === 'image')
).map((tool) => ({
	name: tool.id,
	tool,
	description: `${tool.tagline}. ${tool.description}`,
	parameters: schemaFromFields(tool.fields)
}));

export const CHAT_TOOL_MAP: Map<string, ChatTool> = new Map(
	CHAT_TOOLS.map((chatTool) => [chatTool.name, chatTool])
);

/** The tool list in the OpenAI `tools` format. */
export function toolDefs(): ToolDef[] {
	return CHAT_TOOLS.map(({ name, description, parameters }) => ({
		type: 'function',
		function: { name, description, parameters }
	}));
}

/**
 * The fallback tool protocol used when the endpoint does not support native
 * function calling. Deliberately narrow so parsing is unambiguous.
 */
export function promptToolProtocol(): string {
	const list = CHAT_TOOLS.map((tool) => `- ${tool.name}: ${tool.description}`).join('\n');
	return [
		'You have tools for specialised jobs. When a request matches a tool, use it instead of',
		'doing the task inline. Available tools:',
		list,
		'',
		'To call a tool, reply with ONLY this fenced block and nothing else:',
		'```tool',
		'{"name": "<tool name>", "arguments": { <arguments> }}',
		'```',
		"Use the tool's exact argument names from the schema you are given. After you receive the",
		'tool result, continue or give the final answer.'
	].join('\n');
}

export interface ToolDirective {
	name: string;
	arguments: Record<string, unknown>;
}

function asArguments(value: unknown): Record<string, unknown> {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return {};
}

function tryParse(json: string, known: Map<string, ChatTool>): ToolDirective | undefined {
	try {
		const value = JSON.parse(json.trim());
		if (!value || typeof value !== 'object') return undefined;
		const name = (value as Record<string, unknown>).name ?? (value as Record<string, unknown>).tool;
		if (typeof name !== 'string' || !known.has(name)) return undefined;
		const raw =
			(value as Record<string, unknown>).arguments ?? (value as Record<string, unknown>).parameters;
		return { name, arguments: asArguments(raw) };
	} catch {
		return undefined;
	}
}

/**
 * Parse a prompt-mode tool directive from model output.
 *
 * Accepts a ```tool fenced block, or a bare top-level JSON object. A ```json
 * block is intentionally NOT accepted, so that legitimate JSON answers (e.g.
 * from the extract tool) are not mistaken for tool calls.
 */
export function parseToolDirective(
	text: string,
	known: Map<string, ChatTool> = CHAT_TOOL_MAP
): ToolDirective | undefined {
	for (const match of text.matchAll(/```tool\s*([\s\S]*?)```/gi)) {
		const directive = tryParse(match[1], known);
		if (directive) return directive;
	}
	const trimmed = text.trim();
	if (trimmed.startsWith('{') && trimmed.endsWith('}')) return tryParse(trimmed, known);
	return undefined;
}
