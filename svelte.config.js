import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// When deploying to a GitHub Pages *project* site the app is served from a
// sub-path (e.g. /inference-lab/). Cloudflare Pages and most other hosts serve
// from the root. `BASE_PATH` lets the same build target both.
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Pure SPA: everything ships as static assets and works from any static
		// host (GitHub Pages, Cloudflare Pages, an object store, a USB stick).
		adapter: adapter({
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		paths: {
			base
		},
		alias: {
			$tools: 'src/lib/tools'
		}
	}
};

export default config;
