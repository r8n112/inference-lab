import type { ContentPart } from '$lib/inference/types';
import type { Tool, ToolInput } from './types';

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

/**
 * The tool stack. Each tool is one clear job: a short system prompt, a handful
 * of options, and — where the output is structured — a post-processor. The chat
 * exposes every non-vision tool as a callable function, derived from these same
 * definitions.
 */
export const TOOLS: Tool[] = [
	// ---------------------------------------------------------------- Write --
	{
		id: 'summarize',
		name: 'Summarize',
		tagline: 'Condense long text without losing the point',
		description:
			'Turn an article, log or transcript into a tight summary. Leans on the 262k-token context window, so you can paste whole documents.',
		icon: '📝',
		category: 'Write',
		highlight: 'Uses the 262k context window',
		fields: [
			{
				kind: 'select',
				name: 'length',
				label: 'Length',
				options: [
					{ value: 'one sentence', label: 'One sentence' },
					{ value: 'a few bullets', label: 'A few bullets' },
					{ value: 'one paragraph', label: 'One paragraph' },
					{ value: 'a structured outline with headings', label: 'Detailed outline' }
				],
				default: 'a few bullets'
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
			`Summarize the following text as ${value(input, 'length')}.\n\n---\n${value(input, 'text')}`,
		temperature: 0.1
	},
	{
		id: 'rewrite',
		name: 'Rewrite',
		tagline: 'Change the tone while keeping the meaning',
		description:
			'Rewrite text for a chosen tone and length. Good for release notes, emails and documentation that has drifted.',
		icon: '✍️',
		category: 'Write',
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
					{ value: 'roughly the same length', label: 'About the same' },
					{ value: 'much shorter', label: 'Much shorter' },
					{ value: 'a bit more detailed', label: 'A bit more detailed' }
				],
				default: 'roughly the same length'
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
		category: 'Write',
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
		id: 'proofread',
		name: 'Proofread',
		tagline: 'Fix grammar, spelling and clarity',
		description:
			'Correct spelling, grammar and punctuation, and tighten awkward phrasing, without changing your voice.',
		icon: '🔤',
		category: 'Write',
		fields: [
			{
				kind: 'select',
				name: 'output',
				label: 'Output',
				options: [
					{ value: 'the corrected text only', label: 'Corrected text' },
					{
						value: 'the corrected text followed by a bullet list of the changes you made',
						label: 'Text + list of changes'
					}
				],
				default: 'the corrected text only'
			},
			{
				kind: 'textarea',
				name: 'text',
				label: 'Text to proofread',
				rows: 10,
				required: true
			}
		],
		system:
			'You are a careful copy editor. Fix spelling, grammar, punctuation and unclear phrasing while preserving the author’s meaning and voice. Do not rewrite wholesale. Follow the requested output format exactly.',
		buildUser: (input) =>
			`Proofread the following text. Reply with ${value(input, 'output')}.\n\n---\n${value(input, 'text')}`,
		temperature: 0.1
	},
	{
		id: 'email',
		name: 'Draft an email',
		tagline: 'Turn a brief into a ready-to-send email',
		description:
			'Describe what you need to say and who it is for; get a clear, well-structured email you can send.',
		icon: '✉️',
		category: 'Write',
		fields: [
			{
				kind: 'select',
				name: 'tone',
				label: 'Tone',
				options: [
					{ value: 'friendly and professional', label: 'Friendly & professional' },
					{ value: 'formal', label: 'Formal' },
					{ value: 'direct and brief', label: 'Direct & brief' },
					{ value: 'apologetic', label: 'Apologetic' },
					{ value: 'enthusiastic', label: 'Enthusiastic' }
				],
				default: 'friendly and professional'
			},
			{
				kind: 'textarea',
				name: 'brief',
				label: 'What should the email say?',
				rows: 8,
				required: true,
				placeholder: 'e.g. Remind a client their invoice is two weeks overdue; offer to help.'
			},
			{
				kind: 'text',
				name: 'recipient',
				label: 'Recipient (optional)',
				placeholder: 'e.g. a long-standing client'
			}
		],
		system:
			'You write clear, effective emails. Include a subject line, a short greeting, a focused body and a sign-off. Match the requested tone, keep it concise, and never invent facts or commitments not in the brief.',
		buildUser: (input) => {
			const recipient = value(input, 'recipient');
			return [
				`Write an email in a ${value(input, 'tone')} tone.`,
				recipient ? `Recipient: ${recipient}.` : '',
				`Brief:\n${value(input, 'brief')}`,
				'Use "Subject:" on the first line.'
			]
				.filter(Boolean)
				.join('\n\n');
		},
		temperature: 0.4
	},

	// ----------------------------------------------------------------- Code --
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
		id: 'review-diff',
		name: 'Review a diff',
		tagline: 'A code review of a change',
		description:
			'Paste a diff and get a focused review: correctness, edge cases, security and readability, with concrete suggestions.',
		icon: '🧐',
		category: 'Code',
		fields: [
			{
				kind: 'select',
				name: 'focus',
				label: 'Focus',
				options: [
					{
						value: 'a balanced review covering correctness, readability and tests',
						label: 'Balanced'
					},
					{ value: 'correctness, edge cases and potential bugs', label: 'Correctness' },
					{ value: 'security and input handling', label: 'Security' },
					{ value: 'performance and complexity', label: 'Performance' }
				],
				default: 'a balanced review covering correctness, readability and tests'
			},
			{
				kind: 'textarea',
				name: 'diff',
				label: 'Diff',
				rows: 14,
				required: true
			}
		],
		system:
			'You are a thoughtful senior reviewer. Give specific, actionable feedback grounded in the code shown; never invent context. Prefer a few high-value points over a long list. Use Markdown with file/line references where possible.',
		buildUser: (input) =>
			`Review this change with ${value(input, 'focus')}.\n\n---\n${value(input, 'diff')}`,
		temperature: 0.2
	},
	{
		id: 'explain-error',
		name: 'Explain an error',
		tagline: 'Diagnose a stack trace or error',
		description:
			'Paste an error, stack trace or failing test and get the likely cause, the evidence for it, and how to fix it.',
		icon: '🚨',
		category: 'Code',
		fields: [
			{
				kind: 'textarea',
				name: 'error',
				label: 'Error / stack trace',
				rows: 10,
				required: true
			},
			{
				kind: 'textarea',
				name: 'code',
				label: 'Relevant code (optional)',
				rows: 8
			}
		],
		system:
			'You diagnose software errors. Explain the most likely cause, point to the specific line or frame that supports it, and give concrete fixes. If the cause is genuinely ambiguous, say so and list what to check. Use Markdown.',
		buildUser: (input) => {
			const code = value(input, 'code');
			return [
				`Explain this error and how to fix it:\n\n${value(input, 'error')}`,
				code ? `Relevant code:\n\`\`\`\n${code}\n\`\`\`` : ''
			]
				.filter(Boolean)
				.join('\n\n');
		},
		temperature: 0.1
	},
	{
		id: 'unit-tests',
		name: 'Write tests',
		tagline: 'Generate tests for a function',
		description:
			'Given a function or module, generate focused unit tests covering normal cases, edge cases and failures.',
		icon: '🧪',
		category: 'Code',
		fields: [
			{
				kind: 'text',
				name: 'framework',
				label: 'Test framework (optional)',
				placeholder: 'e.g. pytest, vitest, JUnit, Go testing'
			},
			{
				kind: 'textarea',
				name: 'code',
				label: 'Code under test',
				rows: 14,
				required: true
			}
		],
		system:
			'You write focused, readable unit tests. Cover typical input, boundaries and failure paths. Use the requested framework, or infer it from the code. Reply with the test code in one fenced block and nothing else.',
		buildUser: (input) => {
			const framework = value(input, 'framework');
			return [
				framework ? `Write unit tests using ${framework}.` : 'Write unit tests for this code.',
				`\`\`\`\n${value(input, 'code')}\n\`\`\``
			].join('\n\n');
		},
		temperature: 0.2
	},
	{
		id: 'regex',
		name: 'Build a regex',
		tagline: 'Get a pattern and worked examples',
		description:
			'Describe what you want to match; get a regular expression with an explanation and test cases that show it working.',
		icon: '🎯',
		category: 'Code',
		fields: [
			{
				kind: 'text',
				name: 'flavour',
				label: 'Flavour (optional)',
				placeholder: 'e.g. PCRE, JavaScript, Python, Go'
			},
			{
				kind: 'textarea',
				name: 'requirement',
				label: 'What should it match?',
				rows: 6,
				required: true,
				placeholder: 'e.g. IPv4 addresses, but not with leading zeros'
			},
			{
				kind: 'textarea',
				name: 'examples',
				label: 'Example strings (optional)',
				rows: 5
			}
		],
		system:
			'You write regular expressions. Give the pattern first in a fenced block, then a short explanation of each part, then a table of test strings that match and do not match. Be precise about anchors and escaping.',
		buildUser: (input) => {
			const flavour = value(input, 'flavour');
			const examples = value(input, 'examples');
			return [
				`Build a regular expression${flavour ? ` for ${flavour}` : ''} that matches: ${value(input, 'requirement')}`,
				examples ? `Example strings:\n${examples}` : ''
			]
				.filter(Boolean)
				.join('\n\n');
		},
		temperature: 0
	},

	// ----------------------------------------------------------------- Data --
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
		id: 'sql',
		name: 'Write SQL',
		tagline: 'Turn a question into a query',
		description:
			'Give a schema and a question; get a SQL query with a short explanation. Read-only by default.',
		icon: '🗄️',
		category: 'Data',
		fields: [
			{
				kind: 'select',
				name: 'dialect',
				label: 'Dialect',
				options: [
					{ value: 'PostgreSQL', label: 'PostgreSQL' },
					{ value: 'MySQL', label: 'MySQL' },
					{ value: 'SQLite', label: 'SQLite' },
					{ value: 'Microsoft SQL Server', label: 'SQL Server' },
					{ value: 'BigQuery', label: 'BigQuery' }
				],
				default: 'PostgreSQL'
			},
			{
				kind: 'textarea',
				name: 'schema',
				label: 'Schema',
				rows: 8,
				required: true,
				placeholder: 'CREATE TABLE …'
			},
			{
				kind: 'textarea',
				name: 'question',
				label: 'Question',
				rows: 4,
				required: true,
				placeholder: 'e.g. Top 10 customers by revenue this year'
			}
		],
		system:
			'You write SQL. Produce a single query in the requested dialect using only the tables and columns in the schema. Prefer a read-only SELECT; if the request implies a write, say so explicitly. Give the query in a fenced block, then a brief explanation.',
		buildUser: (input) =>
			`Dialect: ${value(input, 'dialect')}\n\nSchema:\n${value(input, 'schema')}\n\nQuestion: ${value(input, 'question')}`,
		temperature: 0
	},

	// -------------------------------------------------------------- Analyze --
	{
		id: 'action-items',
		name: 'Action items',
		tagline: 'Turn notes into decisions and tasks',
		description:
			'Take meeting notes or a long thread and pull out the decisions, action items and open questions.',
		icon: '✅',
		category: 'Analyze',
		fields: [
			{
				kind: 'textarea',
				name: 'text',
				label: 'Notes or transcript',
				rows: 12,
				required: true
			}
		],
		system:
			'You extract structured outcomes from notes. Reply in Markdown with three sections: "## Decisions", "## Action items" (each as "- [ ] task — owner"), and "## Open questions". Only include what is actually supported by the text; if a section is empty, write "None".',
		buildUser: (input) => `Extract the outcomes from these notes:\n\n---\n${value(input, 'text')}`,
		temperature: 0.1
	},

	// --------------------------------------------------------------- Vision --
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
					{
						value: 'the numbered steps a user would follow in this interface',
						label: 'UI steps'
					},
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

/** Tools grouped by category, in a stable display order. */
export const TOOL_GROUPS: Array<{ category: string; tools: Tool[] }> = [
	'Write',
	'Code',
	'Data',
	'Analyze',
	'Vision'
]
	.map((category) => ({ category, tools: TOOLS.filter((tool) => tool.category === category) }))
	.filter((group) => group.tools.length > 0);
