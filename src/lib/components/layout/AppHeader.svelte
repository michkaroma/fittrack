<script lang="ts">
	import { goto } from '$app/navigation';

	let busy = $state(false);

	async function logout() {
		busy = true;
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} finally {
			await goto('/login');
		}
	}
</script>

<header
	class="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 pt-safe backdrop-blur"
>
	<a href="/" class="flex items-center gap-2" aria-label="FitTrack — accueil">
		<svg width="22" height="22" viewBox="0 0 512 512" aria-hidden="true">
			<rect width="512" height="512" rx="112" fill="rgb(var(--c-surface-2))" />
			<polyline
				points="104,356 184,300 256,322 336,214 408,150"
				fill="none"
				stroke="rgb(var(--c-accent))"
				stroke-width="36"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<circle cx="408" cy="150" r="30" fill="rgb(var(--c-surface-2))" />
			<circle cx="408" cy="150" r="18" fill="rgb(var(--c-accent))" />
		</svg>
		<span class="text-[17px] font-bold tracking-tight text-ink">FitTrack</span>
	</a>
	<button
		type="button"
		onclick={logout}
		disabled={busy}
		class="rounded-[8px] px-2 py-1.5 text-[13px] text-muted transition-colors hover:text-ink"
		aria-label="Se déconnecter"
	>
		Déconnexion
	</button>
</header>
