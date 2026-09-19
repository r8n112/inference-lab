import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests run in Node and cover the pure logic: prompt building, JSON
// post-processing and the SSE client. Svelte components are exercised by hand
// in the browser during development.
export default defineConfig({
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts']
	}
});
