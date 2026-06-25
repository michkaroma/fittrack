<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { ageFromBirthDate } from '$lib/metrics';

	let { data }: { data: PageData } = $props();

	// Date du jour (locale) pour le calcul de l'âge en direct.
	const todayStr = (() => {
		const d = new Date();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${m}-${day}`;
	})();

	const f1 = (n: number) => n.toFixed(1);
	const num = (s: string): number | null => {
		if (s.trim() === '') return null;
		const n = Number(s.replace(',', '.'));
		return Number.isFinite(n) ? n : null;
	};
	const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;

	// ── Objectifs ──────────────────────────────────────────────────────────
	const init = (v: number | null) => (v == null ? '' : String(v));
	let weight = $state(init(data.goals.target_weight_kg));
	let bf = $state(init(data.goals.target_body_fat_pct));
	let goalsBusy = $state(false);
	let goalsError = $state<string | null>(null);
	let goalsSaved = $state(false);

	const wGoal = $derived(num(weight));
	const bfGoal = $derived(num(bf));
	const wGap = $derived(
		wGoal != null && data.currentWeight != null ? wGoal - data.currentWeight : null
	);
	const bfGap = $derived(bfGoal != null && data.currentBf != null ? bfGoal - data.currentBf : null);

	async function saveGoals(e: Event) {
		e.preventDefault();
		goalsBusy = true;
		goalsError = null;
		goalsSaved = false;
		try {
			const res = await fetch('/api/goals', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ target_weight_kg: weight, target_body_fat_pct: bf })
			});
			const out = await res.json().catch(() => null);
			if (!res.ok) {
				goalsError = out?.error?.message ?? 'Échec.';
				return;
			}
			goalsSaved = true;
			await invalidateAll();
		} catch {
			goalsError = 'Réseau indisponible.';
		} finally {
			goalsBusy = false;
		}
	}

	// ── Informations personnelles ───────────────────────────────────────────
	let height = $state(data.profile.height_cm == null ? '' : String(data.profile.height_cm));
	let sex = $state<'male' | 'female' | ''>(data.profile.sex ?? '');
	let birth = $state(data.profile.birth_date ?? '');
	let notes = $state(data.profile.notes ?? '');
	let profileBusy = $state(false);
	let profileError = $state<string | null>(null);
	let profileSaved = $state(false);

	const age = $derived(ageFromBirthDate(birth || null, todayStr));

	const SEX_OPTIONS: { v: 'male' | 'female'; label: string }[] = [
		{ v: 'male', label: 'Masculin' },
		{ v: 'female', label: 'Féminin' }
	];
	function pickSex(v: 'male' | 'female') {
		sex = sex === v ? '' : v; // re-toucher = désélection
		profileSaved = false;
	}

	async function saveProfile(e: Event) {
		e.preventDefault();
		profileBusy = true;
		profileError = null;
		profileSaved = false;
		try {
			const res = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					height_cm: height,
					sex: sex || null,
					birth_date: birth || null,
					notes
				})
			});
			const out = await res.json().catch(() => null);
			if (!res.ok) {
				profileError = out?.error?.message ?? 'Échec.';
				return;
			}
			profileSaved = true;
			await invalidateAll();
		} catch {
			profileError = 'Réseau indisponible.';
		} finally {
			profileBusy = false;
		}
	}
</script>

<svelte:head><title>Paramètres · FitTrack</title></svelte:head>

<h1 class="mb-1 text-[22px] font-bold tracking-tight text-ink">Paramètres</h1>
<p class="mb-6 text-[13px] leading-snug text-muted">
	Tes objectifs et tes informations personnelles. Tout est facultatif et saisi par toi : rien n'est
	imposé. Ces données enrichissent aussi l'export Markdown.
</p>

<!-- ── Objectifs ──────────────────────────────────────────────────────── -->
<section>
	<h2 class="mb-1 text-[15px] font-semibold text-ink">Objectifs</h2>
	<p class="mb-3 text-[13px] leading-snug text-muted">
		Cibles personnelles. Elles s'affichent en ligne cible sur les courbes correspondantes.
	</p>

	<form class="flex flex-col gap-4" onsubmit={saveGoals}>
		<div class="card">
			<label class="block">
				<span class="label">Objectif de poids · kg</span>
				<input class="input" type="text" inputmode="decimal" placeholder="Aucun" bind:value={weight} oninput={() => (goalsSaved = false)} />
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
				<input class="input" type="text" inputmode="decimal" placeholder="Aucun" bind:value={bf} oninput={() => (goalsSaved = false)} />
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

		{#if goalsError}<p class="text-sm text-ink2">{goalsError}</p>{/if}
		{#if goalsSaved}<p class="text-sm text-accent">Objectifs enregistrés.</p>{/if}

		<button type="submit" class="btn-primary" disabled={goalsBusy}>
			{goalsBusy ? 'Enregistrement…' : 'Enregistrer les objectifs'}
		</button>
		<p class="text-[12px] text-muted">Laisse un champ vide pour retirer l'objectif correspondant.</p>
	</form>
</section>

<!-- ── Informations personnelles ──────────────────────────────────────── -->
<section class="mt-10">
	<h2 class="mb-1 text-[15px] font-semibold text-ink">Informations personnelles</h2>
	<p class="mb-3 text-[13px] leading-snug text-muted">
		Données peu variables, utiles pour interpréter la composition corporelle (et lues par l'IA / le
		pro à l'export).
	</p>

	<form class="flex flex-col gap-4" onsubmit={saveProfile}>
		<div class="card flex flex-col gap-4">
			<div class="grid grid-cols-2 gap-3">
				<label class="block">
					<span class="label">Taille · cm</span>
					<input
						class="input"
						type="text"
						inputmode="numeric"
						autocomplete="off"
						placeholder="170"
						bind:value={height}
						oninput={() => (profileSaved = false)}
					/>
				</label>
				<label class="block">
					<span class="label">Date de naissance</span>
					<input
						class="input"
						type="date"
						bind:value={birth}
						oninput={() => (profileSaved = false)}
					/>
				</label>
			</div>
			{#if age != null}
				<p class="-mt-1 text-[13px] tabular-nums text-ink2">{age} ans</p>
			{/if}

			<div>
				<span class="label">Sexe</span>
				<div class="seg w-full" role="tablist" aria-label="Sexe">
					{#each SEX_OPTIONS as opt}
						<button
							type="button"
							role="tab"
							class="seg-tab"
							aria-selected={sex === opt.v}
							onclick={() => pickSex(opt.v)}
						>{opt.label}</button>
					{/each}
				</div>
				<p class="mt-1.5 text-[12px] text-muted">Re-touche le choix actif pour l'effacer.</p>
			</div>

			<label class="block">
				<span class="label">Notes / contexte</span>
				<textarea
					class="block w-full rounded-[6px] border border-border bg-surface2 px-3.5 py-2.5 text-[15px] leading-snug text-ink placeholder:text-muted transition-colors hover:border-muted focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/40"
					rows="4"
					placeholder="Santé, blessures, restrictions alimentaires, contexte sportif…"
					bind:value={notes}
					oninput={() => (profileSaved = false)}
				></textarea>
			</label>
		</div>

		{#if profileError}<p class="text-sm text-ink2">{profileError}</p>{/if}
		{#if profileSaved}<p class="text-sm text-accent">Informations enregistrées.</p>{/if}

		<button type="submit" class="btn-primary" disabled={profileBusy}>
			{profileBusy ? 'Enregistrement…' : 'Enregistrer les informations'}
		</button>
		<p class="text-[12px] text-muted">Tous les champs sont facultatifs.</p>
	</form>
</section>
