<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	const init = (v: number | null) => (v == null ? '' : String(v));
	let weight = $state(init(data.goals.target_weight_kg));
	let bf = $state(init(data.goals.target_body_fat_pct));
	let busy = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	const f1 = (n: number) => n.toFixed(1);
	const num = (s: string): number | null => {
		if (s.trim() === '') return null;
		const n = Number(s.replace(',', '.'));
		return Number.isFinite(n) ? n : null;
	};

	const wGoal = $derived(num(weight));
	const bfGoal = $derived(num(bf));
	const wGap = $derived(
		wGoal != null && data.currentWeight != null ? wGoal - data.currentWeight : null
	);
	const bfGap = $derived(bfGoal != null && data.currentBf != null ? bfGoal - data.currentBf : null);
	const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;

	async function save(e: Event) {
		e.preventDefault();
		busy = true;
		error = null;
		saved = false;
		try {
			const res = await fetch('/api/goals', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ target_weight_kg: weight, target_body_fat_pct: bf })
			});
			const out = await res.json().catch(() => null);
			if (!res.ok) {
				error = out?.error?.message ?? 'Échec.';
				return;
			}
			saved = true;
			await invalidateAll();
		} catch {
			error = 'Réseau indisponible.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Objectifs · FitTrack</title></svelte:head>

<h1 class="mb-1 text-[22px] font-bold tracking-tight text-ink">Objectifs</h1>
<p class="mb-4 text-[13px] leading-snug text-muted">
	Cibles personnelles, saisies par toi. Aucune valeur n'est imposée ni suggérée. Elles s'affichent
	en ligne cible sur les courbes correspondantes.
</p>

<form class="flex flex-col gap-4" onsubmit={save}>
	<div class="card">
		<label class="block">
			<span class="label">Objectif de poids · kg</span>
			<input class="input" type="text" inputmode="decimal" placeholder="Aucun" bind:value={weight} oninput={() => (saved = false)} />
		</label>
		{#if wGoal != null}
			<p class="mt-2 text-[13px] tabular-nums text-ink2">
				{#if data.currentWeight != null}
					Actuel {f1(data.currentWeight)} kg · cible {f1(wGoal)} kg · écart
					<span class="font-num font-semibold text-ink">{signed(wGap ?? 0)} kg</span>
				{:else}
					Cible {f1(wGoal)} kg · aucune mesure de poids enregistrée.
				{/if}
			</p>
		{/if}
	</div>

	<div class="card">
		<label class="block">
			<span class="label">Objectif de masse grasse · %</span>
			<input class="input" type="text" inputmode="decimal" placeholder="Aucun" bind:value={bf} oninput={() => (saved = false)} />
		</label>
		{#if bfGoal != null}
			<p class="mt-2 text-[13px] tabular-nums text-ink2">
				{#if data.currentBf != null}
					Actuel {f1(data.currentBf)} % · cible {f1(bfGoal)} % · écart
					<span class="font-num font-semibold text-ink">{signed(bfGap ?? 0)} pts</span>
				{:else}
					Cible {f1(bfGoal)} % · aucune mesure de masse grasse enregistrée.
				{/if}
			</p>
		{/if}
	</div>

	{#if error}<p class="text-sm text-ink2">{error}</p>{/if}
	{#if saved}<p class="text-sm text-accent">Objectifs enregistrés.</p>{/if}

	<button type="submit" class="btn-primary" disabled={busy}>
		{busy ? 'Enregistrement…' : 'Enregistrer les objectifs'}
	</button>
	<p class="text-[12px] text-muted">Laisse un champ vide pour retirer l'objectif correspondant.</p>
</form>
