import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the PNG/ICO icon set from the single SVG mark in static/.
export default defineConfig({
	headLinkOptions: { preset: '2023' },
	preset: minimal2023Preset,
	images: ['static/favicon.svg']
});
