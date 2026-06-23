<script lang="ts">
	import type { Entry } from '$lib/types';
	import { fatMassKg, fatFreeMassKg, muscleMassKg, macroSplit } from '$lib/metrics';

	let {
		date,
		entry = null,
		onsaved
	}: {
		date: string;
		entry?: Entry | null;
		onsaved?: (e: Entry | null) => void;
	} = $props();

	interface FieldDef {
		key: keyof Omit<Entry, 'date' | 'created_at' | 'updated_at'>;
		label: string;
		unit: string;
		ph: string;
	}
	const GROUPS: { title: string; fields: FieldDef[] }[] = [
		{
			title: 'Composition',
			fields: [
				{ key: 'weight_kg', label: 'Poids', unit: 'kg', ph: '72,5' },
				{ key: 'body_fat_pct', label: 'Masse grasse', unit: '%', ph: '18,0' },
				{ key: 'muscle_pct', label: 'Masse musculaire', unit: '%', ph: '42,0' }
			]
		},
		{
			title: 'Nutrition',
			fields: [
				{ key: 'calories', label: 'Calories', unit: 'kcal', ph: '2200' },
				{ key: 'protein_g', label: 'Protéines', unit: 'g', ph: '150' },
				{ key: 'fat_g', label: 'Lipides', unit: 'g', ph: '70' },
				{ key: 'carbs_g', label: 'Glucides', unit: 'g', ph: '220' }
			]
		}
	];

	const init = (v: number | null | undefined) => (v == null ? '' : String(v));
	let fields = $state<Record<string, string>>({
		weight_kg: init(entry?.weight_kg),
		body_fat_pct: init(entry?.body_fat_pct),
		muscle_pct: init(entry?.muscle_pct),
		calories: init(entry?.calories),
		protein_g: init(entry?.protein_g),
		fat_g: init(entry?.fat_g),
		carbs_g: init(entry?.carbs_g)
	});

	let busy = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	const num = (s: string): number | null => {
		if (s == null || s.trim() === '') return null;
		const n = Number(s.replace(',', '.'));
		return Number.isFinite(n) ? n : null;
	};

	// aperçu calculé en direct
	const preview = $derived.by(() => {
		const w = num(fields.weight_kg);
		const bf = num(fields.body_fat_pct);
		const mu = num(fields.muscle_pct);
		const macros = macroSplit(num(fields.protein_g), num(fields.fat_g), num(fields.carbs_g));
		return {
			fatKg: fatMassKg(w, bf),
			leanKg: fatFreeMassKg(w, bf),
			muscleKg: muscleMassKg(w, mu),
			macros
		};
	});
	const hasPreview = $derived(
		preview.fatKg != null || preview.leanKg != null || preview.muscleKg != null || preview.macros != null
	);

	const f1 = (n: number) => n.toFixed(1);

	async function save(e: Event) {
		e.preventDefault();
		busy = true;
		error = null;
		saved = false;
		try {
			const body = {
				date,
				weight_kg: fields.weight_kg,
				body_fat_pct: fields.body_fat_pct,
				muscle_pct: fields.muscle_pct,
				calories: fields.calories,
				protein_g: fields.protein_g,
				fat_g: fields.fat_g,
				carbs_g: fields.carbs_g
			};
			const res = await fetch('/api/entries', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			const out = await res.json().catch(() => null);
			if (!res.ok) {
				error = out?.error?.message ?? "Échec de l'enregistrement.";
				return;
			}
			saved = true;
			onsaved?.(out?.entry ?? null);
		} catch {
			error = 'Réseau indisponible. Réessaie.';
		} finally {
			busy = false;
		}
	}

	async function remove() {
		busy = true;
		error = null;
		try {
			const res = await fetch(`/api/entries/${date}`, { method: 'DELETE' });
			if (!res.ok) {
				error = 'Suppression impossible.';
				return;
			}
			for (const k of Object.keys(fields)) fields[k] = '';
			saved = false;
			onsaved?.(null);
		} catch {
			error = 'Réseau indisponible.';
		} finally {
			busy = false;
		}
	}
</script>

<form class="flex flex-col gap-5" onsubmit={save}>
	{#each GROUPS as g}
		<fieldset class="flex flex-col gap-3">
			<legend class="eyebrow mb-1">{g.title}</legend>
			<div class="grid grid-cols-2 gap-3">
				{#each g.fields as fld}
					<label class="block">
						<span class="label">{fld.label} · {fld.unit}</span>
						<input
							class="input"
							type="text"
							inputmode="decimal"
							autocomplete="off"
							placeholder={fld.ph}
							bind:value={fields[fld.key]}
							oninput={() => (saved = false)}
						/>
					</label>
				{/each}
			</div>
		</fieldset>
	{/each}

	{#if hasPreview}
		<div class="rounded-[12px] border border-border bg-surface2 p-3">
			<span class="eyebrow">Aperçu calculé</span>
			<div class="mt-2 grid grid-cols-3 gap-2 text-center">
				<div>
					<div class="font-num text-[18px] font-semibold tabular-nums text-ink">
						{preview.fatKg != null ? f1(preview.fatKg) : '—'}
					</div>
					<div class="text-[11px] text-muted">MG kg</div>
				</div>
				<div>
					<div class="font-num text-[18px] font-semibold tabular-nums text-ink">
						{preview.leanKg != null ? f1(preview.leanKg) : '—'}
					</div>
					<div class="text-[11px] text-muted">Maigre kg</div>
				</div>
				<div>
					<div class="font-num text-[18px] font-semibold tabular-nums text-ink">
						{preview.muscleKg != null ? f1(preview.muscleKg) : '—'}
					</div>
					<div class="text-[11px] text-muted">Muscle kg</div>
				</div>
			</div>
			{#if preview.macros}
				<div class="mt-2 text-center text-[12px] tabular-nums text-ink2">
					Macros : P {Math.round(preview.macros.proteinPct)}% · G {Math.round(preview.macros.carbsPct)}%
					· L {Math.round(preview.macros.fatPct)}%
				</div>
			{/if}
		</div>
	{/if}

	{#if error}<p class="text-sm text-ink2">{error}</p>{/if}
	{#if saved}<p class="text-sm text-accent">Mesure enregistrée.</p>{/if}

	<div class="flex gap-3">
		<button type="submit" class="btn-primary flex-1" disabled={busy}>
			{busy ? 'Enregistrement…' : 'Enregistrer'}
		</button>
		{#if entry}
			<button type="button" class="btn-danger" onclick={remove} disabled={busy}>Supprimer</button>
		{/if}
	</div>
</form>
