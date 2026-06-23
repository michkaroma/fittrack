/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// surfaces (dark-first) — valeurs "R G B" définies dans app.css
				bg: 'rgb(var(--c-bg) / <alpha-value>)',
				surface: 'rgb(var(--c-surface) / <alpha-value>)',
				surface2: 'rgb(var(--c-surface-2) / <alpha-value>)',
				border: 'rgb(var(--c-border) / <alpha-value>)',
				elevated: 'rgb(var(--c-elevated) / <alpha-value>)',
				// texte (clé "ink" : "text" entrerait en collision avec le préfixe text-*)
				ink: 'rgb(var(--c-text) / <alpha-value>)',
				ink2: 'rgb(var(--c-text-2) / <alpha-value>)',
				muted: 'rgb(var(--c-muted) / <alpha-value>)',
				// accent unique
				accent: 'rgb(var(--c-accent) / <alpha-value>)',
				'accent-700': 'rgb(var(--c-accent-700) / <alpha-value>)',
				// deltas de variation (non moralisés : ni « bien » ni « mal »)
				up: 'rgb(var(--c-up) / <alpha-value>)',
				down: 'rgb(var(--c-down) / <alpha-value>)'
			},
			fontFamily: {
				sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
				num: ['var(--font-num)', 'var(--font-sans)', 'system-ui', 'sans-serif']
			},
			borderRadius: {
				sm: '8px',
				DEFAULT: '12px',
				lg: '16px',
				xl: '20px',
				'2xl': '24px',
				pill: '9999px'
			},
			boxShadow: {
				card: '0 1px 2px 0 rgb(0 0 0 / 0.4)',
				raised: '0 8px 24px -8px rgb(0 0 0 / 0.6)'
			},
			transitionTimingFunction: {
				'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)'
			}
		}
	},
	plugins: []
};
