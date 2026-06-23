import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ out: 'build', precompress: true })
		// PWA gérée à la main (static/sw.js + static/manifest.webmanifest).
		// Protection CSRF (vérification d'origine) activée par défaut par SvelteKit.
	}
};

export default config;
