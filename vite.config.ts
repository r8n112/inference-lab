import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

const base = process.env.BASE_PATH ?? '';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			// Ship a service worker that precaches the app shell so the UI and
			// all non-inference features work offline. Inference itself needs
			// the network by definition.
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
				// This app is a pure SPA; there is nothing under `prerendered/`.
				globIgnores: ['**/prerendered/**'],
				navigateFallback: `${base}/index.html`,
				// Never try to cache the inference API.
				navigateFallbackDenylist: [/^\/api/],
				cleanupOutdatedCaches: true
			},
			manifest: {
				name: 'Inference Lab',
				short_name: 'Inference Lab',
				description:
					'Small, well-implemented tools for open-weight models on the Hetzner Experiments Inference API. Unofficial homage; not affiliated with Hetzner.',
				start_url: `${base}/`,
				scope: `${base}/`,
				display: 'standalone',
				background_color: '#0b0d12',
				theme_color: '#d50c2d',
				icons: [
					{ src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
					{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
					{
						src: 'maskable-icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			}
		})
	]
});
