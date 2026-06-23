<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { derive } from '$lib/metrics';

	let { data }: { data: PageData } = $props();

	let busy = $state<string | null>(null);

	const f1 = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(1));
	const f0 = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toString());

	const rows = $derived(data.entries.map((e) => ({ e, d: derive(e) })));

	async function remove(date: string) {
		if (!confirm(`Supprimer l'enregistrement du ${date} ?`)) return;
		busy = date;
		try {
			await fetch(`/api/entries/${date}`, { method: 'DELETE' });
			await invalidateAll();
		} finally {
			busy = null;
		}
	}
</script>

<svelte:head><title>Historique · FitTrack</title></svelte:head>

<div class="mb-4 flex items-baseline justify-between">
	<h1 class="text-[22px] font-bold tracking-tight text-ink">Historique</h1>
	<span class="text-[13px] tabular-nums text-muted">{data.entries.length} jour(s)</span>
</div>

{#if data.entries.length === 0}
	<div class="card flex flex-col items-center gap-3 py-10 text-center">
		<p class="text-ink2">Aucun enregistrement.</p>
		<a href="/saisie" class="btn-primary">Saisir une mesure</a>
	</div>
{:else}
	<p class="mb-2 text-[12px] leading-snug text-muted">
		Colonnes calculées : MG kg = poids × MG%/100 · Maigre kg = poids × (1−MG%/100) · Muscle kg =
		poids × Musc%/100 · P/L/G % = part dans les kcal des macros. Touche une date pour modifier.
	</p>
	<div class="card overflow-x-auto p-0">
		<table class="w-full border-collapse text-right text-[13px] tabular-nums">
			<thead>
				<tr class="border-b border-border text-[11px] uppercase tracking-wide text-muted">
					<th class="sticky left-0 bg-surface px-3 py-2.5 text-left font-semibold">Date</th>
					<th class="px-2.5 py-2.5 font-semibold">Poids</th>
					<th class="px-2.5 py-2.5 font-semibold">MG&nbsp;%</th>
					<th class="px-2.5 py-2.5 font-semibold">Musc&nbsp;%</th>
					<th class="px-2.5 py-2.5 font-semibold">MG&nbsp;kg</th>
					<th class="px-2.5 py-2.5 font-semibold">Maigre</th>
					<th class="px-2.5 py-2.5 font-semibold">Musc&nbsp;kg</th>
					<th class="px-2.5 py-2.5 font-semibold">kcal</th>
					<th class="px-2.5 py-2.5 font-semibold">P&nbsp;g</th>
					<th class="px-2.5 py-2.5 font-semibold">L&nbsp;g</th>
					<th class="px-2.5 py-2.5 font-semibold">G&nbsp;g</th>
					<th class="px-2.5 py-2.5 font-semibold">P&nbsp;%</th>
					<th class="px-2.5 py-2.5 font-semibold">L&nbsp;%</th>
					<th class="px-2.5 py-2.5 font-semibold">G&nbsp;%</th>
					<th class="px-2.5 py-2.5"></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as { e, d } (e.date)}
					<tr class="border-b border-border/60 last:border-0">
						<th scope="row" class="sticky left-0 bg-surface px-3 py-2.5 text-left font-medium">
							<a href={`/saisie?date=${e.date}`} class="text-ink hover:text-accent">{e.date}</a>
						</th>
						<td class="px-2.5 py-2.5 text-ink">{f1(e.weight_kg)}</td>
						<td class="px-2.5 py-2.5 text-ink2">{f1(e.body_fat_pct)}</td>
						<td class="px-2.5 py-2.5 text-ink2">{f1(e.muscle_pct)}</td>
						<td class="px-2.5 py-2.5 text-muted">{f1(d.fatMassKg)}</td>
						<td class="px-2.5 py-2.5 text-muted">{f1(d.fatFreeMassKg)}</td>
						<td class="px-2.5 py-2.5 text-muted">{f1(d.muscleMassKg)}</td>
						<td class="px-2.5 py-2.5 text-ink2">{f0(e.calories)}</td>
						<td class="px-2.5 py-2.5 text-ink2">{f0(e.protein_g)}</td>
						<td class="px-2.5 py-2.5 text-ink2">{f0(e.fat_g)}</td>
						<td class="px-2.5 py-2.5 text-ink2">{f0(e.carbs_g)}</td>
						<td class="px-2.5 py-2.5 text-muted">{f0(d.macros?.proteinPct)}</td>
						<td class="px-2.5 py-2.5 text-muted">{f0(d.macros?.fatPct)}</td>
						<td class="px-2.5 py-2.5 text-muted">{f0(d.macros?.carbsPct)}</td>
						<td class="px-2 py-2.5">
							<button
								type="button"
								class="text-muted transition-colors hover:text-ink disabled:opacity-40"
								onclick={() => remove(e.date)}
								disabled={busy === e.date}
								aria-label={`Supprimer le ${e.date}`}>✕</button
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
