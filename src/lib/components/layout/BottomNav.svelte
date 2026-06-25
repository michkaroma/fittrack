<script lang="ts">
	import { page } from '$app/stores';

	const items = [
		{ href: '/', label: 'Tableau', icon: 'chart' },
		{ href: '/saisie', label: 'Saisie', icon: 'plus' },
		{ href: '/historique', label: 'Historique', icon: 'list' },
		{ href: '/parametres', label: 'Paramètres', icon: 'settings' }
	] as const;

	function active(href: string, path: string): boolean {
		return href === '/' ? path === '/' : path.startsWith(href);
	}
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[520px] items-stretch justify-around border-t border-border bg-bg/95 pb-safe backdrop-blur"
	style="height:calc(var(--nav-h) + var(--safe-bottom))"
>
	{#each items as it}
		{@const is = active(it.href, $page.url.pathname)}
		<a
			href={it.href}
			class="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors {is
				? 'text-accent'
				: 'text-muted hover:text-ink2'}"
			aria-current={is ? 'page' : undefined}
		>
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				{#if it.icon === 'chart'}
					<path d="M3 3v18h18" />
					<path d="M19 9l-5 5-3-3-4 4" />
				{:else if it.icon === 'plus'}
					<circle cx="12" cy="12" r="9" />
					<path d="M12 8v8M8 12h8" />
				{:else if it.icon === 'list'}
					<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
				{:else if it.icon === 'settings'}
					<circle cx="12" cy="12" r="3" />
					<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
				{/if}
			</svg>
			{it.label}
		</a>
	{/each}
</nav>
