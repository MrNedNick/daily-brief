import { loadEnv } from 'vite';
import adapter from '@sveltejs/adapter-static';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
// `defineConfig` from vitest/config so the `test` block is typed too.
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Runes everywhere except dependencies. The whole point of this
				// project is Svelte 5 state, so legacy reactivity is off.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Static output: the app talks to the Hacker News API straight from
			// the browser, so there is nothing for a server to do at runtime.
			// `/item/[id]` is unknowable at build time and falls back to the SPA
			// shell, which then loads the story client-side.
			paths: { base: loadEnv('production', '.', 'GITHUB_PAGES').GITHUB_PAGES === 'true' ? '/daily-brief' : '', relative: false },
			adapter: adapter({ fallback: '404.html' })
		})
	],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['src/tests/setup.ts'],
		include: ['src/**/*.test.ts']
	}
});
