<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import EntryForm from '$lib/components/EntryForm.svelte';
	import type { Entry } from '$lib/types';

	let { data }: { data: PageData } = $props();

	let picked = $state(data.date);
	$effect(() => {
		picked = data.date;
	});

	function onDateChange() {
		if (picked && picked !== data.date) {
			goto(picked === data.today ? '/saisie' : `/saisie?date=${picked}`, { keepFocus: true, noScroll: true });
		}
	}

	function onSaved(_e: Entry | null) {
		invalidateAll();
	}

	const f1 = (n: number | null) => (n == null ? '—' : n.toFixed(1));
</script>

<svelte:head><title>Saisie · FitTrack</title></svelte:head>

<h1 class="mb-4 text-[22px] font-bold tracking-tight text-ink">Saisie</h1>

<div class="card mb-4">
	<label class="block">
		<span class="label">Date</span>
		<input
			type="date"
			class="input font-sans text-base"
			max={data.today}
			bind:value={picked}
			onchange={onDateChange}
		/>
	</label>
	<p class="mt-2 text-[12px] text-muted">
		Un enregistrement par jour · tous les champs sont facultatifs · les dates passées sont
		modifiables.
	</p>
</div>

<div class="card">
	{#key data.date}
		<EntryForm date={data.date} entry={data.entry} onsaved={onSaved} />
	{/key}
</div>

{#if data.recent.length}
	<section class="mt-6">
		<h2 class="mb-2 text-[15px] font-semibold text-ink2">Derniers jours</h2>
		<ul class="flex flex-col gap-1.5">
			{#each data.recent as e}
				<li>
					<a
						href={e.date === data.today ? '/saisie' : `/saisie?date=${e.date}`}
						class="flex items-center justify-between rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm transition-colors hover:bg-surface2 {e.date ===
						data.date
							? 'border-accent/50'
							: ''}"
					>
						<span class="tabular-nums text-ink">{e.date}</span>
						<span class="tabular-nums text-muted">
							{e.weight_kg != null ? `${f1(e.weight_kg)} kg` : '—'}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
