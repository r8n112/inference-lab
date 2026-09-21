import { describe, expect, it } from 'vitest';

import {
	buildUserContent,
	classify,
	extensionOf,
	formatBytes,
	formatTextAttachments,
	isTextLike,
	type Attachment
} from './attachments';

describe('extensionOf', () => {
	it('handles normal, dotted and extensionless names', () => {
		expect(extensionOf('main.rs')).toBe('rs');
		expect(extensionOf('archive.tar.gz')).toBe('gz');
		expect(extensionOf('Dockerfile')).toBe('dockerfile');
		expect(extensionOf('.gitignore')).toBe('.gitignore');
	});
});

describe('isTextLike', () => {
	it('accepts text and code by MIME or extension', () => {
		expect(isTextLike('notes.txt', 'text/plain')).toBe(true);
		expect(isTextLike('app.ts', '')).toBe(true);
		expect(isTextLike('data.json', 'application/json')).toBe(true);
		expect(isTextLike('photo.png', 'image/png')).toBe(false);
		expect(isTextLike('blob', 'application/octet-stream')).toBe(false);
	});
});

describe('classify', () => {
	it('accepts images, text and rejects PDFs and unknown types', () => {
		expect(classify('a.png', 'image/png', 1000)).toEqual({ kind: 'image' });
		expect(classify('a.md', 'text/markdown', 1000)).toEqual({ kind: 'text' });
		expect(classify('a.pdf', 'application/pdf', 1000).kind).toBe('unsupported');
		expect(classify('a.bin', 'application/octet-stream', 1000).kind).toBe('unsupported');
	});

	it('rejects oversized images', () => {
		const decision = classify('big.png', 'image/png', 6_000_000);
		expect(decision.kind).toBe('unsupported');
	});
});

describe('formatBytes', () => {
	it('formats bytes, KB and MB', () => {
		expect(formatBytes(512)).toBe('512 B');
		expect(formatBytes(2048)).toBe('2.0 KB');
		expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
	});
});

const image: Attachment = {
	id: 'i1',
	name: 'shot.png',
	mime: 'image/png',
	kind: 'image',
	size: 10,
	dataUrl: 'data:image/png;base64,AAAA'
};
const file: Attachment = {
	id: 't1',
	name: 'main.rs',
	mime: 'text/plain',
	kind: 'text',
	size: 12,
	text: 'fn main() {}'
};

describe('formatTextAttachments', () => {
	it('inlines text files with their name', () => {
		const out = formatTextAttachments([file]);
		expect(out).toContain('File "main.rs"');
		expect(out).toContain('fn main() {}');
	});

	it('notes truncation', () => {
		const out = formatTextAttachments([{ ...file, truncated: true }]);
		expect(out).toContain('truncated');
	});

	it('ignores image attachments', () => {
		expect(formatTextAttachments([image])).toBe('');
	});
});

describe('buildUserContent', () => {
	it('puts the prompt first and appends image parts', () => {
		const parts = buildUserContent('describe this', [image]);
		expect(parts[0]).toEqual({ type: 'text', text: 'describe this' });
		expect(parts[1]).toEqual({ type: 'image_url', image_url: { url: image.dataUrl } });
	});

	it('inlines text files into the text part', () => {
		const parts = buildUserContent('summarize', [file]);
		expect(parts).toHaveLength(1);
		const text = (parts[0] as { text: string }).text;
		expect(text).toContain('summarize');
		expect(text).toContain('fn main() {}');
	});

	it('still produces a text part when only files are attached', () => {
		const parts = buildUserContent('', [image]);
		expect((parts[0] as { text: string }).text).toBeTruthy();
	});
});
