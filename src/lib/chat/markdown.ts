/**
 * Markdown rendering for chat messages.
 *
 * Rendered HTML is sanitised with DOMPurify before it reaches the DOM, and code
 * blocks are highlighted with a small set of registered languages (importing all
 * of highlight.js would be needlessly large). Browser-only.
 */

import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdownLang from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { marked } from 'marked';
import 'highlight.js/styles/github-dark.css';

for (const [name, language] of Object.entries({
	bash,
	css,
	diff,
	go,
	javascript,
	json,
	markdown: markdownLang,
	python,
	rust,
	sql,
	typescript,
	xml,
	yaml
})) {
	hljs.registerLanguage(name, language);
}

marked.use({ gfm: true, breaks: true });

/** Render Markdown to sanitised HTML. */
export function renderMarkdown(source: string): string {
	const html = marked.parse(source ?? '', { async: false }) as string;
	return DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] });
}

/** Highlight any unprocessed code blocks inside `root`. */
export function highlightWithin(root: HTMLElement): void {
	for (const block of root.querySelectorAll<HTMLElement>('pre code')) {
		if (!block.dataset.highlighted) {
			try {
				hljs.highlightElement(block);
			} catch {
				// Highlighting must never break rendering.
			}
		}
	}
}

/**
 * Svelte action: render Markdown into `node` and highlight code, re-running
 * whenever the source changes.
 */
export function markdown(node: HTMLElement, source = '') {
	const render = (value: string) => {
		node.innerHTML = renderMarkdown(value);
		highlightWithin(node);
	};
	render(source);
	return { update: render };
}
