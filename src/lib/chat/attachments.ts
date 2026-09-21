/**
 * File attachments.
 *
 * Images are sent to the model as image parts. Text-like files are read
 * client-side and inlined as text, because the API has no file-upload endpoint.
 * Classification and formatting are pure so they can be unit-tested; only
 * `readFile` touches the browser File API.
 */

import type { ContentPart } from '$lib/inference/types';

export type AttachmentKind = 'image' | 'text';

export interface Attachment {
	id: string;
	name: string;
	mime: string;
	kind: AttachmentKind;
	/** Byte size on disk. */
	size: number;
	/** Present for images: a data URL. */
	dataUrl?: string;
	/** Present for text files: the decoded contents. */
	text?: string;
	/** Set when a text file was truncated to fit the limit. */
	truncated?: boolean;
}

export const MAX_FILES = 6;
export const MAX_TEXT_BYTES = 200_000;
export const MAX_IMAGE_BYTES = 5_000_000;

/** Extensions we treat as text even when the browser reports no/odd MIME. */
const TEXT_EXTENSIONS = new Set([
	'txt',
	'md',
	'markdown',
	'json',
	'jsonc',
	'yaml',
	'yml',
	'toml',
	'csv',
	'tsv',
	'xml',
	'html',
	'htm',
	'css',
	'scss',
	'js',
	'mjs',
	'cjs',
	'jsx',
	'ts',
	'tsx',
	'py',
	'rb',
	'go',
	'rs',
	'java',
	'kt',
	'c',
	'h',
	'cpp',
	'hpp',
	'cc',
	'cs',
	'php',
	'swift',
	'sh',
	'bash',
	'zsh',
	'sql',
	'ini',
	'cfg',
	'conf',
	'env',
	'log',
	'diff',
	'patch',
	'gitignore',
	'dockerfile',
	'makefile'
]);

const TEXT_MIME = new Set([
	'application/json',
	'application/ld+json',
	'application/xml',
	'application/x-yaml',
	'application/yaml',
	'application/toml',
	'application/javascript',
	'application/x-sh',
	'application/x-httpd-php',
	'application/sql'
]);

export function extensionOf(name: string): string {
	const dot = name.lastIndexOf('.');
	if (dot <= 0 || dot === name.length - 1) return name.toLowerCase();
	return name.slice(dot + 1).toLowerCase();
}

/** Whether a file looks like text we can inline. */
export function isTextLike(name: string, mime: string): boolean {
	if (mime.startsWith('text/')) return true;
	if (TEXT_MIME.has(mime.toLowerCase())) return true;
	return TEXT_EXTENSIONS.has(extensionOf(name));
}

export type Classification =
	{ kind: 'image' } | { kind: 'text' } | { kind: 'unsupported'; reason: string };

/** Decide how a file will be handled, or why it cannot be. */
export function classify(name: string, mime: string, size: number): Classification {
	if (mime.startsWith('image/')) {
		if (size > MAX_IMAGE_BYTES) {
			return { kind: 'unsupported', reason: `image larger than ${formatBytes(MAX_IMAGE_BYTES)}` };
		}
		return { kind: 'image' };
	}
	if (isTextLike(name, mime)) return { kind: 'text' };
	if (mime === 'application/pdf') {
		return { kind: 'unsupported', reason: 'PDFs are not supported; copy the text instead' };
	}
	return { kind: 'unsupported', reason: 'unsupported file type' };
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

let counter = 0;
export function attachmentId(): string {
	counter += 1;
	return `a_${Date.now().toString(36)}_${counter}`;
}

/** Read a file into an Attachment, or return a reason it was rejected. */
export async function readFile(
	file: File
): Promise<{ attachment: Attachment } | { error: string }> {
	const decision = classify(file.name, file.type, file.size);
	if (decision.kind === 'unsupported') {
		return { error: `${file.name}: ${decision.reason}` };
	}

	const id = attachmentId();
	if (decision.kind === 'image') {
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(file);
		});
		return {
			attachment: { id, name: file.name, mime: file.type, kind: 'image', size: file.size, dataUrl }
		};
	}

	const raw = await file.text();
	let text = raw;
	let truncated = false;
	// Truncate on a byte budget, approximated by character count for speed.
	if (raw.length > MAX_TEXT_BYTES) {
		text = raw.slice(0, MAX_TEXT_BYTES);
		truncated = true;
	}
	return {
		attachment: {
			id,
			name: file.name,
			mime: file.type || 'text/plain',
			kind: 'text',
			size: file.size,
			text,
			truncated
		}
	};
}

/** Build the text preamble that inlines text attachments for the model. */
export function formatTextAttachments(attachments: Attachment[]): string {
	return attachments
		.filter((attachment) => attachment.kind === 'text' && attachment.text !== undefined)
		.map((attachment) => {
			const truncated = attachment.truncated ? '\n[truncated to fit the size limit]' : '';
			return `File "${attachment.name}":\n\`\`\`\n${attachment.text}${truncated}\n\`\`\``;
		})
		.join('\n\n');
}

/**
 * Build the user message content: the prompt (plus inlined text files) as a
 * text part, then one image part per image attachment.
 */
export function buildUserContent(prompt: string, attachments: Attachment[]): ContentPart[] {
	const textFiles = formatTextAttachments(attachments);
	const text = [prompt.trim(), textFiles].filter(Boolean).join('\n\n');
	const parts: ContentPart[] = [{ type: 'text', text: text || '(no message)' }];
	for (const attachment of attachments) {
		if (attachment.kind === 'image' && attachment.dataUrl) {
			parts.push({ type: 'image_url', image_url: { url: attachment.dataUrl } });
		}
	}
	return parts;
}
