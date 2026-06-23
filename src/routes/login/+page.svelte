<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let password = $state('');
	let error = $state<string | null>(null);
	let busy = $state(false);

	async function submit(e: Event) {
		e.preventDefault();
		busy = true;
		error = null;
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ password })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				error = data?.error?.message ?? 'Connexion impossible.';
				return;
			}
			const to = $page.url.searchParams.get('redirectTo') ?? '/';
			await goto(to);
		} catch {
			error = 'Connexion impossible. Réessaie.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Connexion · FitTrack</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-7 p-6">
	<div class="flex flex-col items-center gap-3 text-center">
		<svg width="56" height="56" viewBox="0 0 512 512" aria-hidden="true">
			<rect width="512" height="512" rx="112" fill="rgb(var(--c-surface-2))" />
			<polyline
				points="104,356 184,300 256,322 336,214 408,150"
				fill="none"
				stroke="rgb(var(--c-accent))"
				stroke-width="30"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<circle cx="408" cy="150" r="28" fill="rgb(var(--c-surface-2))" />
			<circle cx="408" cy="150" r="16" fill="rgb(var(--c-accent))" />
		</svg>
		<h1 class="text-2xl font-bold tracking-tight text-ink">FitTrack</h1>
		<p class="text-sm text-muted">Entre ton mot de passe pour continuer.</p>
	</div>

	<form class="flex w-full flex-col gap-3" onsubmit={submit}>
		<input
			type="password"
			class="input text-center font-sans text-base"
			bind:value={password}
			placeholder="Mot de passe"
			autocomplete="current-password"
			required
		/>
		{#if error}<div class="text-center text-sm text-ink2">{error}</div>{/if}
		<button type="submit" class="btn-primary w-full" disabled={busy || !password}>
			{busy ? 'Connexion…' : 'Se connecter'}
		</button>
	</form>
</main>
