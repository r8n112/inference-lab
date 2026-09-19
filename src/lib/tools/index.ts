import type { Tool, ToolInput } from './types';
import type { ContentPart } from '$lib/inference/types';

/** Remove a surrounding ```lang … ``` fence, if present. */
export function stripFences(text: string): string {
	const match = text.trim().match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n?```$/);
	return (match ? match[1] : text).trim();
}

/** Parse JSON, tolerating fences and leading prose, and pretty-print it. */
export function prettyJson(text: string): string {
	const cleaned = stripFences(text);
	try {
		return JSON.stringify(JSON.parse(cleaned), null, 2);
	} catch {
		// Fall back to the first {...} or [...] block.
		const start = cleaned.search(/[[{]/);
		const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
		if (start !== -1 && end > start) {
			try {
				return JSON.stringify(JSON.parse(cleaned.slice(start, end + 1)), null, 2);
			} catch {
				/* fall through */
			}
		}
		return cleaned;
	}
}

const value = (input: ToolInput, name: string): string => (input.values[name] ?? '').trim();

export const TOOLS: Tool[] = [
	{
		id: 'summarize',
		name: 'Summarize',
		tagline: 'Condense long text without losing the point',
		description:
			'Turn an article, log or transcript into a tight summary. Leans on the model’s 262k-token context, so you can paste whole documents.',
		icon: '📝',
		category: 'Text',
		highlight: 'Uses the 262k context window',
		fields: [
			{
				kind: 'select',
				name: 'length',
				label: 'Length',
				options: [
					{ value: 'one-sentence', label: 'One sentence' },
					{ value: 'bullets', label: 'A few bullets' },
					{ value: 'paragraph', label: 'One paragraph' },
					{ value: 'detailed', label: 'Detailed outline' }
				],
				default: 'bullets'
			},
			{
				kind: 'textarea',
				name: 'text',
				label: 'Text to summarize',
				rows: 12,
				required: true,
				placeholder: 'Paste an article, meeting notes, a stack trace…'
			}
		],
		system:
			'You are a precise editor. Summarize faithfully, keep names and numbers exact, and never invent facts. Reply with the summary only.',
		buildUser: (input) =>
			`Summarize the following text. Format: ${value(input, 'length')}.\n\n---\n${value(input, 'text')}`,
		temperature: 0.1
	},
	{
		id: 'extract',
		name: 'Extract to JSON',
		tagline: 'Pull structured data out of messy text',
		description:
			'Describe the shape you want, paste any text, and get back valid JSON. Useful for invoices, emails, tickets and logs.',
		icon: '🧩',
		category: 'Data',
		highlight: 'Strict JSON output',
		fields: [
			{
				kind: 'textarea',
				name: 'schema',
				label: 'Desired JSON shape',
				rows: 6,
				required: true,
				default:
					'{\n  "name": "string",\n  "date": "YYYY-MM-DD",\n  "total": number,\n  "items": [{ "description": "string", "amount": number }]\n}'
			},
			{
				kind: 'textarea',
				name: 'text',
				label: 'Source text',
				rows: 10,
				required: true,
				placeholder: 'Paste the text to extract from…'
			}
		],
		system:
			'You extract data. Reply with a single JSON value that matches the requested shape and nothing else. Use null for missing fields. Do not add commentary or code fences.',
		buildUser: (input) =>
			`Extract data from the text below into exactly this JSON shape:\n\n${value(input, 'schema')}\n\nText:\n---\n${value(input, 'text')}`,
		temperature: 0,
		postProcess: prettyJson,
		note: 'Output is parsed and pretty-printed; if the model slips, we show the raw text.'
	},
	{
		id: 'rewrite',
		name: 'Rewrite',
		tagline: 'Change the tone while keeping the meaning',
		description:
			'Rewrite text for a chosen tone and length. Good for release notes, emails and documentation that has drifted.',
		icon: '✍️',
		category: 'Text',
		fields: [
			{
				kind: 'select',
				name: 'tone',
				label: 'Tone',
				options: [
					{ value: 'neutral and clear', label: 'Neutral' },
					{ value: 'friendly and warm', label: 'Friendly' },
					{ value: 'concise and professional', label: 'Professional' },
					{ value: 'technical and precise', label: 'Technical' },
					{ value: 'playful', label: 'Playful' }
				],
				default: 'concise and professional'
			},
			{
				kind: 'select',
				name: 'length',
				label: 'Length',
				options: [
					{ value: 'roughly the same', label: 'About the same' },
					{ value: 'much shorter', label: 'Much shorter' },
					{ value: 'a bit more detailed', label: 'A bit more detailed' }
				],
				default: 'roughly the same'
			},
			{
				kind: 'textarea',
				name: 'text',
				label: 'Text to rewrite',
				rows: 10,
				required: true
			}
		],
		system:
			'You rewrite text. Preserve every fact and number exactly; only change wording, tone and length. Reply with the rewritten text only.',
		buildUser: (input) =>
			`Rewrite the following text in a ${value(input, 'tone')} tone, ${value(input, 'length')}. Keep Markdown formatting.\n\n---\n${value(input, 'text')}`,
		temperature: 0.3
	},
	{
		id: 'translate',
		name: 'Translate',
		tagline: 'Translate while preserving Markdown',
		description:
			'Translate text and keep its structure — headings, lists, code blocks and links stay intact.',
		icon: '🌍',
		category: 'Text',
		fields: [
			{
				kind: 'select',
				name: 'target',
				label: 'Target language',
				options: [
					{ value: 'English', label: 'English' },
					{ value: 'German', label: 'German' },
					{ value: 'French', label: 'French' },
					{ value: 'Spanish', label: 'Spanish' },
					{ value: 'Italian', label: 'Italian' },
					{ value: 'Portuguese', label: 'Portuguese' },
					{ value: 'Dutch', label: 'Dutch' },
					{ value: 'Polish', label: 'Polish' },
					{ value: 'Japanese', label: 'Japanese' },
					{ value: 'Chinese (Simplified)', label: 'Chinese (Simplified)' }
				],
				default: 'English'
			},
			{
				kind: 'textarea',
				name: 'text',
				label: 'Text to translate',
				rows: 10,
				required: true
			}
		],
		system:
			'You are a professional translator. Preserve Markdown structure, code blocks, inline code, URLs and placeholders exactly. Translate naturally, not word-for-word. Reply with the translation only.',
		buildUser: (input) =>
			`Translate into ${value(input, 'target')}:\n\n---\n${value(input, 'text')}`,
		temperature: 0.2
	},
	{
		id: 'commit',
		name: 'Commit message',
		tagline: 'Turn a diff into a conventional commit',
		description:
			'Paste a git diff and get a Conventional Commits message with a body. Handy when the change is obvious but the wording is not.',
		icon: '🔧',
		category: 'Code',
		fields: [
			{
				kind: 'textarea',
				name: 'diff',
				label: 'git diff',
				rows: 14,
				required: true,
				placeholder: 'diff --git a/… b/…'
			},
			{
				kind: 'text',
				name: 'context',
				label: 'Extra context (optional)',
				placeholder: 'e.g. fixes #123'
			}
		],
		system:
			'You write Conventional Commits. Choose the narrowest correct type (feat, fix, docs, refactor, perf, test, build, ci, chore). Subject ≤ 72 chars, imperative mood, no trailing period. Then a blank line and a short body wrapped at 72 columns explaining what and why. Reply with the message only, no fences.',
		buildUser: (input) => {
			const context = value(input, 'context');
			return `Write a commit message for this diff.${context ? `\nContext: ${context}` : ''}\n\n---\n${value(input, 'diff')}`;
		},
		temperature: 0,
		postProcess: stripFences
	},
	{
		id: 'explain-code',
		name: 'Explain code',
		tagline: 'Understand unfamiliar code fast',
		description:
			'Get a plain-language explanation of a snippet, at the depth you need — from a one-liner to a line-by-line walkthrough.',
		icon: '🔍',
		category: 'Code',
		fields: [
			{
				kind: 'select',
				name: 'depth',
				label: 'Depth',
				options: [
					{ value: 'a one-paragraph summary', label: 'Summary' },
					{ value: 'a structured explanation with sections', label: 'Structured' },
					{ value: 'a line-by-line walkthrough', label: 'Line by line' }
				],
				default: 'a structured explanation with sections'
			},
			{
				kind: 'textarea',
				name: 'code',
				label: 'Code',
				rows: 14,
				required: true
			}
		],
		system:
			'You explain code clearly and correctly. Describe what it does, its inputs and outputs, any assumptions, and subtle behaviour or bugs worth noting. Use Markdown. Do not invent APIs.',
		buildUser: (input) =>
			`Explain the following code in ${value(input, 'depth')}.\n\n\`\`\`\n${value(input, 'code')}\n\`\`\``,
		temperature: 0.2
	},
	{
		id: 'classify',
		name: 'Classify & tag',
		tagline: 'Sort text into your own labels',
		description:
			'Define a fixed label set and classify any text into it, with a one-line reason and a confidence score.',
		icon: '🏷️',
		category: 'Data',
		highlight: 'Strict JSON output',
		fields: [
			{
				kind: 'text',
				name: 'labels',
				label: 'Labels (comma-separated)',
				required: true,
				default: 'bug, feature request, question, billing, other'
			},
			{
				kind: 'textarea',
				name: 'text',
				label: 'Text to classify',
				rows: 10,
				required: true
			}
		],
		system:
			'You classify text. Choose only from the allowed labels (a text may have several). Reply with a single JSON object: {"labels": string[], "confidence": number, "reason": string}. No commentary, no fences.',
		buildUser: (input) =>
			`Allowed labels: ${value(input, 'labels')}.\nClassify the following text:\n\n---\n${value(input, 'text')}`,
		temperature: 0,
		postProcess: prettyJson
	},
	{
		id: 'describe-image',
		name: 'Describe an image',
		tagline: 'Alt text, UI steps or a full description',
		description:
			'Upload a screenshot or photo and get useful text back: accessibility alt text, the steps shown in a UI, or a detailed description. Uses the model’s vision input.',
		icon: '🖼️',
		category: 'Vision',
		highlight: 'Vision input',
		needsVision: true,
		fields: [
			{
				kind: 'select',
				name: 'mode',
				label: 'What do you need?',
				options: [
					{ value: 'concise alt text (one sentence)', label: 'Alt text' },
					{ value: 'the numbered steps a user would follow in this interface', label: 'UI steps' },
					{
						value: 'a detailed description covering layout, text and notable details',
						label: 'Full description'
					}
				],
				default: 'concise alt text (one sentence)'
			},
			{
				kind: 'image',
				name: 'image',
				label: 'Image',
				help: 'Stays on your device until you press Run; sent only to the inference API.'
			}
		],
		system:
			'You describe images accurately. Only state what is actually visible; do not guess at hidden text or intent. Reply with the requested description only.',
		buildUser: (input): ContentPart[] => {
			const parts: ContentPart[] = [
				{ type: 'text', text: `Describe this image. Output: ${value(input, 'mode')}.` }
			];
			const image = value(input, 'image');
			if (image) parts.push({ type: 'image_url', image_url: { url: image } });
			return parts;
		},
		temperature: 0.2
	}
];

export const TOOL_MAP: Map<string, Tool> = new Map(TOOLS.map((tool) => [tool.id, tool]));

export function getTool(id: string): Tool | undefined {
	return TOOL_MAP.get(id);
}
