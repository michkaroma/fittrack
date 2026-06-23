<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import LineChart from '$lib/components/charts/LineChart.svelte';
	import StackedAreaChart from '$lib/components/charts/StackedAreaChart.svelte';
	import StatTile from '$lib/components/StatTile.svelte';
	import {
		series,
		rollingAverage,
		fatFreeMassKg,
		fatMassKg,
		muscleMassKg,
		macroSplit,
		stat,
		lastDelta,
		type Point
	} from '$lib/metrics';
	import type { Period } from '$lib/types';

	let { data }: { data: PageData } = $props();

	const f1 = (n: number) => n.toFixed(1);
	const f0 = (n: number) => Math.round(n).toString();

	const PERIODS: { id: Period; label: string }[] = [
		{ id: '7', label: '7 j' },
		{ id: '30', label: '30 j' },
		{ id: '90', label: '90 j' },
		{ id: 'all', label: 'Tout' }
	];
	function setPeriod(p: Period) {
		goto(p === '30' ? '/' : `/?period=${p}`, { keepFocus: true, noScroll: true });
	}

	let macroMode = $state<'g' | 'pct'>('g');

	// ── séries dérivées ────────────────────────────────────────────────────
	const E = $derived(data.entries);

	const weightPts = $derived(series(E, 'weight_kg'));
	const weightMa = $derived(rollingAverage(weightPts, 7));
	const bfPts = $derived(series(E, 'body_fat_pct'));
	const bfMa = $derived(rollingAverage(bfPts, 7));
	const musclePts = $derived(series(E, 'muscle_pct'));
	const caloriePts = $derived(series(E, 'calories'));
	const effortPts = $derived(series(E, 'effort'));

	// composition (kg) : masse maigre + masse grasse = poids ; muscle superposé
	const fatFreePts = $derived(
		E.filter((e) => e.weight_kg != null && e.body_fat_pct != null).map(
			(e): Point => ({ date: e.date, value: fatFreeMassKg(e.weight_kg, e.body_fat_pct)! })
		)
	);
	const fatPts = $derived(
		E.filter((e) => e.weight_kg != null && e.body_fat_pct != null).map(
			(e): Point => ({ date: e.date, value: fatMassKg(e.weight_kg, e.body_fat_pct)! })
		)
	);
	const musclekgPts = $derived(
		E.filter((e) => e.weight_kg != null && e.muscle_pct != null).map(
			(e): Point => ({ date: e.date, value: muscleMassKg(e.weight_kg, e.muscle_pct)! })
		)
	);

	// macros
	const proteinG = $derived(series(E, 'protein_g'));
	const fatG = $derived(series(E, 'fat_g'));
	const carbsG = $derived(series(E, 'carbs_g'));
	const macroPctPts = $derived.by(() => {
		const p: Point[] = [];
		const c: Point[] = [];
		const f: Point[] = [];
		for (const e of E) {
			const m = macroSplit(e.protein_g, e.fat_g, e.carbs_g);
			if (m) {
				p.push({ date: e.date, value: m.proteinPct });
				c.push({ date: e.date, value: m.carbsPct });
				f.push({ date: e.date, value: m.fatPct });
			}
		}
		return { p, c, f };
	});

	// résumé d'en-tête
	const sWeight = $derived(stat(E, 'weight_kg'));
	const sBf = $derived(stat(E, 'body_fat_pct'));
	const sMuscle = $derived(stat(E, 'muscle_pct'));
	const sCal = $derived(stat(E, 'calories'));
	const sEffort = $derived(stat(E, 'effort'));

	const hasAny = $derived(E.length > 0);
</script>

<svelte:head><title>Tableau de bord · FitTrack</title></svelte:head>

<!-- sélecteur de période -->
<div class="mb-4 flex items-center justify-between gap-3">
	<h1 class="text-[22px] font-bold tracking-tight text-ink">Tableau de bord</h1>
	<div class="seg" role="tablist" aria-label="Période">
		{#each PERIODS as p}
			<button
				type="button"
				role="tab"
				aria-selected={data.period === p.id}
				class="seg-tab"
				onclick={() => setPeriod(p.id)}>{p.label}</button
			>
		{/each}
	</div>
</div>

{#if !hasAny}
	<div class="card flex flex-col items-center gap-3 py-10 text-center">
		<p class="text-ink2">Aucune mesure sur cette période.</p>
		<a href="/saisie" class="btn-primary">Saisir une mesure</a>
	</div>
{:else}
	<!-- tuiles : dernières valeurs + variation -->
	<div class="flex flex-col gap-3">
		<StatTile label="Poids" value={sWeight.last} unit="kg" delta={lastDelta(E, 'weight_kg')} format={f1} big />
		<div class="grid grid-cols-2 gap-3">
			<StatTile label="Masse grasse" value={sBf.last} unit="%" delta={lastDelta(E, 'body_fat_pct')} format={f1} />
			<StatTile label="Muscle" value={sMuscle.last} unit="%" delta={lastDelta(E, 'muscle_pct')} format={f1} />
			<StatTile label="Calories" value={sCal.last} unit="kcal" delta={lastDelta(E, 'calories')} format={f0} />
			<StatTile label="Activité" value={sEffort.last} unit="/5" delta={lastDelta(E, 'effort')} format={f0} />
		</div>
	</div>

	<!-- poids -->
	<section class="mt-5">
		<h2 class="mb-2 text-[17px] font-semibold text-ink">Poids</h2>
		<div class="card">
			<LineChart
				height={220}
				unit="kg"
				format={f1}
				showLegend
				ariaLabel="Évolution du poids"
				target={data.goals.target_weight_kg != null
					? { value: data.goals.target_weight_kg, label: `CIBLE ${f1(data.goals.target_weight_kg)}` }
					: null}
				series={[
					{ label: 'Poids', points: weightPts, tone: 'accent', dash: 'solid', area: true },
					{ label: 'Moyenne 7 j', points: weightMa, tone: 'bright', dash: 'dotted', width: 1.5, smooth: true }
				]}
			/>
		</div>
	</section>

	<!-- composition kg -->
	<section class="mt-5">
		<h2 class="mb-1 text-[17px] font-semibold text-ink">Composition (kg)</h2>
		<p class="mb-2 text-[12px] leading-snug text-muted">
			Masse maigre + masse grasse = poids. La masse musculaire (sous-ensemble de la masse maigre,
			qui inclut os, eau et organes) est superposée.
		</p>
		<div class="card">
			<StackedAreaChart
				height={220}
				unit="kg"
				format={f1}
				ariaLabel="Composition corporelle en kilogrammes"
				stack={[
					{ label: 'Masse maigre', tone: 'bright', points: fatFreePts },
					{ label: 'Masse grasse', tone: 'dim', hatch: true, points: fatPts }
				]}
				overlay={{ label: 'Masse musculaire', tone: 'accent', points: musclekgPts }}
			/>
		</div>
	</section>

	<!-- masse grasse % -->
	<section class="mt-5">
		<h2 class="mb-2 text-[17px] font-semibold text-ink">Masse grasse (%)</h2>
		<div class="card">
			<LineChart
				height={190}
				unit="%"
				format={f1}
				showLegend
				ariaLabel="Évolution de la masse grasse en pourcentage"
				target={data.goals.target_body_fat_pct != null
					? { value: data.goals.target_body_fat_pct, label: `CIBLE ${f1(data.goals.target_body_fat_pct)}` }
					: null}
				series={[
					{ label: 'MG %', points: bfPts, tone: 'accent', dash: 'solid' },
					{ label: 'Moyenne 7 j', points: bfMa, tone: 'bright', dash: 'dotted', width: 1.5, smooth: true }
				]}
			/>
		</div>
	</section>

	<!-- muscle % -->
	<section class="mt-5">
		<h2 class="mb-2 text-[17px] font-semibold text-ink">Masse musculaire (%)</h2>
		<div class="card">
			<LineChart
				height={190}
				unit="%"
				format={f1}
				ariaLabel="Évolution de la masse musculaire en pourcentage"
				series={[{ label: 'Muscle %', points: musclePts, tone: 'accent', dash: 'solid' }]}
			/>
		</div>
	</section>

	<!-- calories -->
	<section class="mt-5">
		<h2 class="mb-2 text-[17px] font-semibold text-ink">Calories (kcal)</h2>
		<div class="card">
			<LineChart
				height={190}
				unit="kcal"
				format={f0}
				ariaLabel="Évolution des calories"
				series={[{ label: 'Calories', points: caloriePts, tone: 'accent', dash: 'solid', area: true }]}
			/>
		</div>
	</section>

	<!-- activité physique -->
	<section class="mt-5">
		<h2 class="mb-2 text-[17px] font-semibold text-ink">Activité physique (1–5)</h2>
		<div class="card">
			<LineChart
				height={170}
				unit="/5"
				format={f0}
				ariaLabel="Niveau d'effort physique quotidien"
				series={[{ label: 'Effort', points: effortPts, tone: 'accent', dash: 'solid', area: true }]}
			/>
		</div>
	</section>

	<!-- macros -->
	<section class="mt-5">
		<div class="mb-2 flex items-center justify-between gap-3">
			<h2 class="text-[17px] font-semibold text-ink">Macronutriments</h2>
			<div class="seg" role="tablist" aria-label="Affichage des macros">
				<button type="button" role="tab" aria-selected={macroMode === 'g'} class="seg-tab" onclick={() => (macroMode = 'g')}>grammes</button>
				<button type="button" role="tab" aria-selected={macroMode === 'pct'} class="seg-tab" onclick={() => (macroMode = 'pct')}>%</button>
			</div>
		</div>
		<div class="card">
			{#if macroMode === 'g'}
				<LineChart
					height={200}
					unit="g"
					format={f0}
					showLegend
					ariaLabel="Macronutriments en grammes"
					series={[
						{ label: 'Protéines', points: proteinG, tone: 'accent', dash: 'solid' },
						{ label: 'Glucides', points: carbsG, tone: 'bright', dash: 'solid', width: 1.5 },
						{ label: 'Lipides', points: fatG, tone: 'dim', dash: 'solid', width: 1.5 }
					]}
				/>
			{:else}
				<StackedAreaChart
					height={200}
					unit="%"
					format={f0}
					normalize
					ariaLabel="Répartition des macronutriments en pourcentage des calories"
					stack={[
						{ label: 'Protéines', tone: 'accent', points: macroPctPts.p },
						{ label: 'Glucides', tone: 'bright', points: macroPctPts.c },
						{ label: 'Lipides', tone: 'dim', hatch: true, points: macroPctPts.f }
					]}
				/>
			{/if}
			<p class="mt-2 text-[11px] leading-snug text-muted">
				% calculé sur les kcal issues des macros (protéines et glucides à 4 kcal/g, lipides à 9
				kcal/g) — indépendant des calories saisies.
			</p>
		</div>
	</section>

	<!-- export -->
	<section class="mt-6">
		<a href="/api/export?period=all" class="btn-ghost w-full" download>
			Exporter en Markdown (tout l'historique)
		</a>
	</section>
{/if}
